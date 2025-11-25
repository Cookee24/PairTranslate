import type { TranslateOptions, TranslateService } from "@/utils/rpc";
import { estimateTokens } from "@/utils/token-estimate";
import { createQueueHub } from "~/utils/async/queue-hub";
import { STORAGE_KEYS } from "~/utils/constants";
import {
	convertFromLLMError,
	convertFromTranslationError,
	createTranslateError,
	TranslateErrorType,
} from "~/utils/errors";
import type {
	StreamRunner,
	UnaryResult,
} from "~/utils/flow-control/model-queue";
import { computeCacheKey } from "~/utils/hasher";
import type {
	ChatRequest,
	ClientConfig,
	JSONSchema,
	LLMClient,
	LLMProvider,
} from "~/utils/llm";
import { createLLMClient } from "~/utils/llm";
import { appendReasoningContent } from "~/utils/llm/reasoning";
import type { PromptStepOutput } from "~/utils/prompt/delimiter";
import {
	type CompiledPrompt,
	compilePrompt,
	initializeConversation,
	normalizeLLMStepOutput,
	normalizePromptInput,
	normalizeStreamAggregate,
	snapshotConversation,
	toTextArray,
} from "~/utils/prompt/engine";
import {
	buildContextWithTranslateParams,
	tokensToString,
} from "~/utils/prompt/parser";
import type { ServiceSettings } from "~/utils/settings";
import { getSettings, listenSettings } from "~/utils/settings/helper";
import { createLRUStorage } from "~/utils/storage";
import {
	translate as runTraditionalService,
	type TranslationConfig,
} from "~/utils/translate";
import type { TranslateContext } from "~/utils/types";

const SINGLE_TEXT_SERVICES = new Set(["deeplx", "browser"]);

type TranslatePayload = string | string[];

type ThinCacheKey = Awaited<ReturnType<typeof computeCacheKey>>;

type ThinCacheState = {
	keys: ThinCacheKey[];
	values: (string | undefined)[];
	missing: number[];
};

type CachedValue<T = unknown> = {
	output: T;
	reasoning?: string;
};

const toStreamChunk = (value: unknown): string => {
	if (typeof value === "string") {
		return value;
	}
	if (value === undefined || value === null) {
		return "";
	}
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
};

const buildLLMClient = (
	provider: LLMProvider,
	config: ClientConfig,
): LLMClient => {
	switch (provider) {
		case "openai":
			return createLLMClient("openai", config);
		case "anthropic":
			return createLLMClient("anthropic", config);
		case "google":
			return createLLMClient("google", config);
		default:
			throw new Error(`Unsupported LLM provider: ${provider}`);
	}
};

const isStructuredOutput = (
	output: PromptStepOutput,
): output is { type: "structured"; schema: object } =>
	typeof output === "object" &&
	output !== null &&
	"type" in output &&
	output.type === "structured";

const ensureServiceModel = (
	service: Extract<ServiceSettings, { type: "llm" }>,
): string => {
	const model = service.model;
	if (model) {
		return model;
	}
	throw createTranslateError(
		TranslateErrorType.VALIDATION_ERROR,
		`Model not configured for ${service.name}`,
	);
};

const createChatRequest = (
	service: Extract<ServiceSettings, { type: "llm" }>,
	messages: ChatRequest["messages"],
	overrides?: Partial<Pick<ChatRequest, "stream">>,
): ChatRequest => ({
	model: ensureServiceModel(service),
	messages,
	temperature: service.temperature,
	maxTokens: service.maxOutputTokens,
	...overrides,
});

const throwIfAborted = (signal?: AbortSignal) => {
	if (signal?.aborted) {
		throw new DOMException("Aborted", "AbortError");
	}
};

export const createTranslateService = async (): Promise<TranslateService> => {
	let settings = await getSettings();
	if (!settings) {
		throw new Error("Settings not initialized");
	}

	const promptCache = new Map<string, CompiledPrompt>();
	const clientCache = new Map<string, LLMClient>();
	const resultCache = createLRUStorage<CachedValue>(
		"translate-cache",
		STORAGE_KEYS.cache,
		settings.queue.cacheSize,
	);

	const debugState = () => settings.debug;

	const isCacheEnabled = () => !debugState().disableCache;

	const getCacheEntry = async (key: ArrayBuffer) => {
		if (!isCacheEnabled()) {
			return undefined;
		}
		return resultCache.get(key);
	};

	const setCacheEntry = async (key: ArrayBuffer, value: CachedValue) => {
		if (!isCacheEnabled()) {
			return;
		}
		await resultCache.set(key, value);
	};

	const applyDebugLatency = async () => {
		const latency = debugState().simulateLatencyMs;
		if (latency > 0) {
			await new Promise((resolve) => setTimeout(resolve, latency));
		}
	};

	const debugLog = (...args: unknown[]) => {
		if (!debugState().verboseLogging) {
			return;
		}
		console.info("[PairTranslate][Debug]", ...args);
	};

	const logGroup = (enabled: boolean, label: string, details: () => void) => {
		if (!enabled) return;
		console.groupCollapsed(label);
		try {
			details();
		} finally {
			console.groupEnd();
		}
	};

	const preview = (value: string, limit = 160) =>
		value.length > limit ? `${value.slice(0, limit)}…` : value;

	const traceLlms = (
		phase: "request" | "response",
		meta: Record<string, unknown>,
	) => {
		logGroup(
			debugState().traceLlms,
			`[LLM ${phase}] ${meta.model ?? meta.service ?? ""}`,
			() => {
				console.log(meta);
			},
		);
	};

	const traceTraditional = (
		phase: "request" | "response",
		meta: Record<string, unknown>,
	) => {
		logGroup(
			debugState().traceTraditional,
			`[Traditional ${phase}] ${meta.apiSpec ?? meta.service ?? ""}`,
			() => {
				console.log(meta);
			},
		);
	};

	const resolveService = (modelId: string): ServiceSettings => {
		const service = settings.services[modelId];
		if (!service) {
			throw createTranslateError(
				TranslateErrorType.MODEL_NOT_FOUND,
				`Model ${modelId} not found. Please check your settings.`,
			);
		}
		return service;
	};

	const getPrompt = (promptId: string): CompiledPrompt => {
		const cached = promptCache.get(promptId);
		if (cached) return cached;
		const prompt = settings.prompts[promptId];
		if (!prompt) {
			throw createTranslateError(
				TranslateErrorType.INVALID_PROMPT,
				`Prompt ${promptId} not found. Please check your settings.`,
			);
		}
		const compiled = compilePrompt(prompt);
		promptCache.set(promptId, compiled);
		return compiled;
	};

	const getQueueConfig = (modelId: string) => {
		const base = settings.queue;
		const override = settings.services[modelId]?.queue;
		return {
			requestConcurrency:
				override?.requestConcurrency ?? base.requestConcurrency,
			tokensPerMinute: override?.tokensPerMinute ?? base.tokensPerMinute,
		};
	};

	const ensureLLMClient = (
		modelId: string,
		service: Extract<ServiceSettings, { type: "llm" }>,
	): LLMClient => {
		const cached = clientCache.get(modelId);
		if (cached) return cached;
		const baseUrl = service.baseUrl;
		const client = buildLLMClient(service.apiSpec, {
			apiKey: service.apiKey,
			baseUrl,
		});
		clientCache.set(modelId, client);
		return client;
	};

	const queueHub = createQueueHub((modelId: string) => {
		const config = getQueueConfig(modelId);
		return {
			requestConcurrency: config.requestConcurrency,
			tokensPerMinute: config.tokensPerMinute,
		};
	});

	listenSettings((next) => {
		settings = next;
		promptCache.clear();
		clientCache.clear();
		queueHub.refresh();
		resultCache.resize(next.queue.cacheSize);
	});

	const runTraditional = async (
		service: Extract<ServiceSettings, { type: "traditional" }>,
		texts: string[],
		srcLang: string,
		dstLang: string,
	): Promise<{ result: string[]; tokens: number }> => {
		const runOnce = async (texts: string[]) => {
			try {
				const response = await runTraditionalService(
					service.apiSpec,
					service as TranslationConfig,
					{
						text: texts,
						sourceLang: srcLang,
						targetLang: dstLang,
					},
				);
				return response;
			} catch (error) {
				throw convertFromTranslationError(error);
			}
		};

		traceTraditional("request", {
			service: service.name,
			apiSpec: service.apiSpec,
			texts: texts.length,
			characters: texts.reduce((sum, entry) => sum + entry.length, 0),
			srcLang,
			dstLang,
		});

		const tokenEstimate = estimateTokens(texts);
		let result: string[];
		if (SINGLE_TEXT_SERVICES.has(service.apiSpec)) {
			const translated: string[] = [];
			for (const text of texts) {
				const response = await runOnce([text]);
				translated.push(response.translatedText[0]);
			}
			result = translated;
		} else {
			const response = await runOnce(texts);
			result = response.translatedText;
		}
		traceTraditional("response", {
			service: service.name,
			apiSpec: service.apiSpec,
			items: result.length,
			tokens: tokenEstimate,
		});
		return { result, tokens: tokenEstimate };
	};

	const runTraditionalStream = (
		service: Extract<ServiceSettings, { type: "traditional" }>,
		payload: TranslatePayload,
		srcLang: string,
		dstLang: string,
		onResult: (value: string[]) => void,
	): StreamRunner => {
		return async () => {
			const texts = toTextArray(payload);
			if (texts.length === 0) {
				onResult([]);
				return {
					iterator: (async function* () {
						yield { content: "" };
					})(),
					completion: Promise.resolve(0),
				};
			}
			const { result, tokens } = await runTraditional(
				service,
				texts,
				srcLang,
				dstLang,
			);
			onResult(result);
			const combined = result.join("\n");
			return {
				iterator: (async function* () {
					yield { content: combined };
				})(),
				completion: Promise.resolve(tokens),
			};
		};
	};

	const runLLMSteps = async (
		modelId: string,
		service: Extract<ServiceSettings, { type: "llm" }>,
		prompt: CompiledPrompt,
		textPayload: TranslatePayload,
		ctx: TranslateContext,
		srcLang: string,
		dstLang: string,
		signal?: AbortSignal,
	): Promise<{ result: unknown; tokens: number; reasoning?: string }> => {
		const client = ensureLLMClient(modelId, service);
		const promptCtx = buildContextWithTranslateParams(
			ctx,
			{ src: srcLang, dst: dstLang },
			textPayload,
		);
		const outputs: unknown[] = [];
		promptCtx.output = outputs;
		const conversation = initializeConversation(prompt, promptCtx);
		let totalTokens = 0;
		let reasoning: string | undefined;
		let stepIndex = 0;
		for (const step of prompt.steps) {
			stepIndex += 1;
			throwIfAborted(signal);
			conversation.push({
				role: "user",
				content: tokensToString(promptCtx, step.messageTokens),
			});
			const request = createChatRequest(
				service,
				snapshotConversation(conversation),
			);
			const latestMessage = conversation.at(-1);
			traceLlms("request", {
				service: service.name,
				model: service.model ?? "(unset)",
				step: stepIndex,
				stream: false,
				snippet:
					typeof latestMessage?.content === "string"
						? preview(latestMessage.content)
						: undefined,
			});
			try {
				const schema = isStructuredOutput(step.output)
					? (step.output.schema as JSONSchema)
					: undefined;
				const response = await client.chat(request, schema);
				totalTokens +=
					response.usage?.totalTokens ?? response.usage?.promptTokens ?? 0;
				reasoning = appendReasoningContent(reasoning, response.reasoning);
				const output = normalizeLLMStepOutput(step, response.output);
				outputs.push(output);
				conversation.push({
					role: "assistant",
					content: response.content ?? toStreamChunk(output),
				});
				traceLlms("response", {
					service: service.name,
					model: service.model ?? "(unset)",
					step: stepIndex,
					stream: false,
					snippet:
						typeof output === "string"
							? preview(output)
							: Array.isArray(output)
								? `array(${output.length})`
								: typeof output,
					tokens:
						response.usage?.totalTokens ??
						response.usage?.completionTokens ??
						response.usage?.promptTokens ??
						0,
				});
			} catch (error) {
				throw convertFromLLMError(error);
			}
		}
		return {
			result: outputs.at(-1),
			tokens: totalTokens,
			reasoning,
		};
	};

	const runLLMStream = (
		modelId: string,
		service: Extract<ServiceSettings, { type: "llm" }>,
		prompt: CompiledPrompt,
		textPayload: TranslatePayload,
		ctx: TranslateContext,
		srcLang: string,
		dstLang: string,
		signal?: AbortSignal,
	): StreamRunner => {
		return async () => {
			const client = ensureLLMClient(modelId, service);
			const promptCtx = buildContextWithTranslateParams(
				ctx,
				{ src: srcLang, dst: dstLang },
				textPayload,
			);
			const outputs: unknown[] = [];
			promptCtx.output = outputs;
			const conversation = initializeConversation(prompt, promptCtx);
			const lastIndex = prompt.steps.length - 1;
			for (let index = 0; index < lastIndex; index++) {
				const step = prompt.steps[index];
				conversation.push({
					role: "user",
					content: tokensToString(promptCtx, step.messageTokens),
				});
				const request = createChatRequest(
					service,
					snapshotConversation(conversation),
				);
				const latestMessage = conversation.at(-1);
				traceLlms("request", {
					service: service.name,
					model: service.model ?? "(unset)",
					step: index + 1,
					stream: false,
					snippet:
						typeof latestMessage?.content === "string"
							? preview(latestMessage.content)
							: undefined,
				});
				try {
					const schema = isStructuredOutput(step.output)
						? (step.output.schema as JSONSchema)
						: undefined;
					const response = await client.chat(request, schema);
					const output = normalizeLLMStepOutput(step, response.output);
					outputs.push(output);
					conversation.push({
						role: "assistant",
						content: response.content ?? toStreamChunk(output),
					});
					traceLlms("response", {
						service: service.name,
						model: service.model ?? "(unset)",
						step: index + 1,
						stream: false,
						snippet:
							typeof output === "string"
								? preview(output)
								: Array.isArray(output)
									? `array(${output.length})`
									: typeof output,
					});
				} catch (error) {
					throw convertFromLLMError(error);
				}
			}
			const finalStep = prompt.steps.at(-1);
			if (!finalStep) {
				throw createTranslateError(
					TranslateErrorType.VALIDATION_ERROR,
					"No steps available in the prompt. This should not happen.",
				);
			}
			conversation.push({
				role: "user",
				content: tokensToString(promptCtx, finalStep.messageTokens),
			});
			const request = createChatRequest(
				service,
				snapshotConversation(conversation),
				{ stream: true },
			);
			const latestPrompt = conversation.at(-1);
			traceLlms("request", {
				service: service.name,
				model: service.model ?? "(unset)",
				step: prompt.steps.length,
				stream: true,
				snippet:
					typeof latestPrompt?.content === "string"
						? preview(latestPrompt.content)
						: undefined,
			});

			const { promise: completion, resolve: resolveCompletion } =
				Promise.withResolvers<number>();
			const source = client.chatStream(request);
			return {
				iterator: (async function* () {
					try {
						while (true) {
							throwIfAborted(signal);
							const next = await source.next();
							if (next.done) {
								if (next.value.reasoning) {
									yield { reasoning: next.value.reasoning };
								}
								traceLlms("response", {
									service: service.name,
									model: service.model ?? "(unset)",
									stream: true,
									tokens: next.value.usage?.completionTokens ?? 0,
									reasoningChars: next.value.reasoning?.length ?? 0,
								});
								resolveCompletion(next.value.usage?.completionTokens ?? 0);
								return;
							}
							const chunk = next.value;
							if (chunk.content || chunk.reasoning) {
								yield chunk;
							}
						}
					} finally {
						await source.return({});
						resolveCompletion(0);
					}
				})(),
				completion,
			};
		};
	};

	const executeUnary = async (
		ctx: TranslateContext,
		options: TranslateOptions,
		text: string | string[] | undefined,
		// biome-ignore lint/suspicious/noExplicitAny: result can be any type
	): Promise<UnaryResult<any>> => {
		const modelId = options.modelId;
		const promptId = options.promptId;
		if (!promptId) {
			throw createTranslateError(
				TranslateErrorType.INVALID_PROMPT,
				"Prompt ID is required",
			);
		}
		const service = resolveService(modelId);
		const payload = text ?? "";
		const expectsArray = Array.isArray(payload);
		const compiled = service.type === "llm" ? getPrompt(promptId) : undefined;
		const payloadArray = Array.isArray(payload) ? payload : undefined;
		const supportsThinCache =
			Boolean(options.thinCache) &&
			!!payloadArray &&
			(service.type === "traditional" ||
				(service.type === "llm" && compiled?.input === "stringArray"));

		const cacheKey = await computeCacheKey(
			promptId,
			modelId,
			text,
			ctx,
			options.srcLang,
			options.dstLang,
		);
		let thinCacheState: ThinCacheState | undefined;

		debugLog("unary/start", {
			modelId,
			promptId,
			payloadType: Array.isArray(text) ? "array" : typeof text,
			payloadSize: Array.isArray(text)
				? text.length
				: typeof text === "string"
					? text.length
					: 0,
		});

		if (options.cleanCache) {
			await resultCache.del(cacheKey);
		}

		if (supportsThinCache && payloadArray) {
			const entryKeys = await Promise.all(
				payloadArray.map((entry) =>
					computeCacheKey(
						promptId,
						modelId,
						entry,
						ctx,
						options.srcLang,
						options.dstLang,
					),
				),
			);
			const cacheState: ThinCacheState = {
				keys: entryKeys,
				values: new Array(payloadArray.length),
				missing: [],
			};
			thinCacheState = cacheState;
			if (options.cleanCache) {
				await Promise.all(entryKeys.map((key) => resultCache.del(key)));
				cacheState.missing = payloadArray.map((_, index) => index);
			} else {
				const cachedEntries = await Promise.all(
					entryKeys.map((key) => getCacheEntry(key)),
				);
				cachedEntries.forEach((entry, index) => {
					if (entry && typeof entry.output === "string") {
						cacheState.values[index] = entry.output;
					} else {
						cacheState.missing.push(index);
					}
				});
				if (cacheState.missing.length === 0) {
					const cachedValue = cacheState.values.slice() as string[];
					await setCacheEntry(cacheKey, { output: cachedValue });
					await applyDebugLatency();
					debugLog("unary/cache-hit", {
						modelId,
						promptId,
						type: "thin",
						entries: cachedValue.length,
					});
					return {
						value: {
							output: cachedValue,
							reasoning: undefined,
						},
						completionTokens: 0,
					};
				}
			}
		} else if (!options.cleanCache) {
			const cached = await getCacheEntry(cacheKey);
			if (cached) {
				await applyDebugLatency();
				debugLog("unary/cache-hit", {
					modelId,
					promptId,
					type: "full",
				});
				return {
					value: cached,
					completionTokens: 0,
				};
			}
		}

		const executionPayload =
			thinCacheState && payloadArray
				? thinCacheState.missing.map((index) => payloadArray[index])
				: payload;
		const normalizedPayload =
			service.type === "llm" && compiled
				? normalizePromptInput(compiled, executionPayload)
				: Array.isArray(executionPayload)
					? executionPayload
					: executionPayload;
		let translationResult: unknown;
		let completionTokens = 0;
		let reasoning: string | undefined;

		if (service.type === "traditional") {
			const texts = toTextArray(
				Array.isArray(normalizedPayload)
					? normalizedPayload
					: [normalizedPayload],
			);
			if (texts.length === 0) {
				return {
					value: {
						output: expectsArray ? [] : "",
						reasoning: undefined,
					},
					completionTokens: 0,
				};
			}
			const traditionalResult = await runTraditional(
				service,
				texts,
				options.srcLang,
				options.dstLang,
			);
			translationResult = traditionalResult.result;
			completionTokens = traditionalResult.tokens;
		} else {
			const compiledPrompt = compiled ?? getPrompt(promptId);
			const llmResult = await runLLMSteps(
				modelId,
				service,
				compiledPrompt,
				normalizedPayload,
				ctx,
				options.srcLang,
				options.dstLang,
			);
			translationResult = llmResult.result;
			completionTokens = llmResult.tokens;
			reasoning = llmResult.reasoning;
		}

		let finalValue = translationResult;
		if (thinCacheState && payloadArray) {
			if (!Array.isArray(translationResult)) {
				throw createTranslateError(
					TranslateErrorType.VALIDATION_ERROR,
					"Thin cache requires translation results to be arrays.",
				);
			}
			if (translationResult.length !== thinCacheState.missing.length) {
				throw createTranslateError(
					TranslateErrorType.VALIDATION_ERROR,
					`Expected ${thinCacheState.missing.length} translations, but got ${translationResult.length}`,
				);
			}
			const merged = thinCacheState.values.slice();
			thinCacheState.missing.forEach((index, idx) => {
				merged[index] = translationResult[idx];
			});
			finalValue = merged;
			await Promise.all(
				thinCacheState.missing.map((index) =>
					(async () => {
						const value = merged[index];
						if (value === undefined) {
							throw createTranslateError(
								TranslateErrorType.VALIDATION_ERROR,
								"Thin cache entry missing expected translation result.",
							);
						}
						await setCacheEntry(thinCacheState.keys[index], {
							output: value,
						});
					})(),
				),
			);
		}

		await setCacheEntry(cacheKey, {
			output: finalValue,
			reasoning,
		});
		await applyDebugLatency();
		debugLog("unary/complete", {
			modelId,
			promptId,
			stream: false,
			completionTokens,
			reasoning: Boolean(reasoning),
		});
		return {
			value: {
				output: finalValue,
				reasoning,
			},
			completionTokens,
		};
	};

	return {
		async unary(
			ctx: TranslateContext,
			options: TranslateOptions,
			text?: string | string[],
		) {
			const payload = text ?? "";
			const service = resolveService(options.modelId);
			const prompt =
				service.type === "llm" ? getPrompt(options.promptId) : undefined;
			const normalized = prompt
				? normalizePromptInput(prompt, payload)
				: (payload ?? "");
			const estimated = estimateTokens(normalized);
			const queue = queueHub.queue(options.modelId);
			return queue.enqueueUnary(
				() => executeUnary(ctx, options, payload),
				estimated,
			);
		},
		stream(
			ctx: TranslateContext,
			options: TranslateOptions,
			text?: string | string[],
			_meta?: unknown,
			signal?: AbortSignal,
		) {
			const modelId = options.modelId;
			const promptId = options.promptId;
			const service = resolveService(modelId);
			const payload = text ?? "";
			const compiledPrompt =
				service.type === "llm" ? getPrompt(promptId) : undefined;
			const normalized =
				service.type === "llm" && compiledPrompt
					? normalizePromptInput(compiledPrompt, payload)
					: payload;

			debugLog("stream/start", {
				modelId,
				promptId,
				cleanCache: Boolean(options.cleanCache),
			});
			return (async function* () {
				const cacheKey = await computeCacheKey(
					modelId,
					promptId,
					text,
					ctx,
					options.srcLang,
					options.dstLang,
				);
				if (options.cleanCache) {
					await resultCache.del(cacheKey);
				} else {
					const cached = await getCacheEntry(cacheKey);
					const cachedValue = cached?.output;
					if (cachedValue !== undefined) {
						await applyDebugLatency();
						debugLog("stream/cache-hit", {
							modelId,
							promptId,
						});
						yield {
							content:
								typeof cachedValue === "string"
									? cachedValue
									: toStreamChunk(cachedValue),
						};
						if (cached?.reasoning) {
							yield { reasoning: cached.reasoning };
						}
						return;
					}
				}
				const queue = queueHub.queue(modelId);
				const estimated = estimateTokens(normalized);
				const finalStep = compiledPrompt?.steps.at(-1);
				let traditionalResult: string[] | undefined;
				const streamRunner =
					service.type === "llm"
						? runLLMStream(
								modelId,
								service,
								compiledPrompt ?? getPrompt(promptId),
								normalized,
								ctx,
								options.srcLang,
								options.dstLang,
								signal,
							)
						: runTraditionalStream(
								service,
								normalized,
								options.srcLang,
								options.dstLang,
								(result) => {
									traditionalResult = result;
								},
							);
				const iterator = await queue.enqueueStream(streamRunner, estimated);
				let translationAggregate = "";
				let reasoningAggregate = "";
				let emitted = false;
				try {
					for await (const chunk of iterator) {
						if (!emitted) {
							emitted = true;
							await applyDebugLatency();
						}
						if (chunk.content) {
							translationAggregate += chunk.content;
						}
						if (chunk.reasoning) {
							reasoningAggregate += chunk.reasoning;
						}
						yield chunk;
					}
					if (service.type === "llm") {
						const normalizedOutput = normalizeStreamAggregate(
							finalStep,
							translationAggregate,
						);
						await setCacheEntry(cacheKey, {
							output: normalizedOutput,
							reasoning: reasoningAggregate || undefined,
						});
					} else if (traditionalResult) {
						await setCacheEntry(cacheKey, {
							output: Array.isArray(payload)
								? traditionalResult
								: traditionalResult[0],
						});
					}
					debugLog("stream/complete", {
						modelId,
						promptId,
						aggregatedSize: translationAggregate.length,
						reasoningSize: reasoningAggregate.length,
					});
				} finally {
					if (signal?.aborted) {
						// @ts-expect-error This is fine, since no one is using the value.
						await iterator.return();
					}
				}
			})();
		},
		async clearCache() {
			await resultCache.clear();
		},
		queueStatus(modelId: string) {
			resolveService(modelId);
			return queueHub.subscribe(modelId);
		},
	};
};
