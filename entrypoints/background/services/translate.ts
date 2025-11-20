import type { TranslateOptions, TranslateService } from "@/utils/rpc";
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
import {
	buildContextWithTranslateParams,
	templateToTokens,
	tokensToString,
} from "~/utils/prompt/parser";
import type { PromptSettings, ServiceSettings } from "~/utils/settings";
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
	values: unknown[];
	missing: number[];
};

const estimateLLMTokens = (payload: TranslatePayload): number => {
	if (Array.isArray(payload)) {
		return payload.reduce((total, part) => total + estimateLLMTokens(part), 0);
	}
	return Math.max(1, Math.ceil(payload.length / 4));
};

const estimateTraditionalTokens = (payload: TranslatePayload): number => {
	if (Array.isArray(payload)) {
		return payload.reduce(
			(total, part) => total + estimateTraditionalTokens(part),
			0,
		);
	}
	return Math.max(1, Math.ceil(payload.length / 2));
};

type CompiledStep = {
	messageTokens: ReturnType<typeof templateToTokens>;
	output: PromptSettings["steps"][number]["output"];
};

type CompiledPrompt = {
	input: PromptSettings["input"];
	systemTokens: ReturnType<typeof templateToTokens>;
	steps: CompiledStep[];
};

type PromptContext = ReturnType<typeof buildContextWithTranslateParams>;

const initializeConversation = (
	prompt: CompiledPrompt,
	ctx: PromptContext,
): ChatRequest["messages"] => {
	const systemContent = tokensToString(ctx, prompt.systemTokens);
	return systemContent ? [{ role: "system", content: systemContent }] : [];
};

const snapshotConversation = (
	messages: ChatRequest["messages"],
): ChatRequest["messages"] => messages.map((message) => ({ ...message }));

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
	output: PromptSettings["steps"][number]["output"],
): output is { type: "structured"; schema: object } =>
	typeof output === "object" &&
	output !== null &&
	"type" in output &&
	output.type === "structured";

const isStringArrayOutput = (
	output: PromptSettings["steps"][number]["output"],
): output is { type: "stringArray"; delimiter: string } =>
	typeof output === "object" &&
	output !== null &&
	"type" in output &&
	output.type === "stringArray";

const compilePrompt = (prompt: PromptSettings): CompiledPrompt => ({
	input: prompt.input,
	systemTokens: templateToTokens(prompt.systemPrompt),
	steps: prompt.steps.map((step) => ({
		output: step.output,
		messageTokens: templateToTokens(step.message),
	})),
});

const normalizePromptInput = (
	prompt: CompiledPrompt,
	text: TranslatePayload,
): TranslatePayload => {
	if (prompt.input === "stringArray") {
		if (Array.isArray(text)) return text;
		return text ? [text] : [];
	}
	if (Array.isArray(text)) {
		return text.join("\n\n");
	}
	return text;
};

const toTextArray = (text: TranslatePayload): string[] =>
	Array.isArray(text) ? text : text ? [text] : [];

const normalizeLLMStepOutput = (
	step: CompiledStep,
	output: unknown,
): unknown => {
	if (isStringArrayOutput(step.output) && typeof output === "string") {
		const delimiter = step.output.delimiter ?? "\n";
		return output
			.split(delimiter)
			.map((entry) => entry.trim())
			.filter(Boolean);
	}
	return output;
};

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

const estimateTokensForService = (
	service: ServiceSettings,
	payload: TranslatePayload,
): number =>
	service.type === "llm"
		? estimateLLMTokens(payload)
		: estimateTraditionalTokens(payload);

export const createTranslateService = async (): Promise<TranslateService> => {
	let settings = await getSettings();
	if (!settings) {
		throw new Error("Settings not initialized");
	}

	const promptCache = new Map<string, CompiledPrompt>();
	const clientCache = new Map<string, LLMClient>();
	const resultCache = createLRUStorage(
		"translate-cache",
		STORAGE_KEYS.cache,
		settings.queue.cacheSize,
	);

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

		if (SINGLE_TEXT_SERVICES.has(service.apiSpec)) {
			const translated: string[] = [];
			for (const text of texts) {
				const response = await runOnce([text]);
				translated.push(response.translatedText[0]);
			}
			return { result: translated, tokens: estimateTraditionalTokens(texts) };
		}

		const response = await runOnce(texts);
		return {
			result: response.translatedText,
			tokens: estimateTraditionalTokens(texts),
		};
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
						yield "";
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
					yield combined;
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
	): Promise<{ result: unknown; tokens: number }> => {
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
		for (const step of prompt.steps) {
			throwIfAborted(signal);
			conversation.push({
				role: "user",
				content: tokensToString(promptCtx, step.messageTokens),
			});
			const request = createChatRequest(
				service,
				snapshotConversation(conversation),
			);
			try {
				const schema = isStructuredOutput(step.output)
					? (step.output.schema as JSONSchema)
					: undefined;
				const response = await client.chat(request, schema);
				totalTokens +=
					response.usage?.totalTokens ?? response.usage?.promptTokens ?? 0;
				const output = normalizeLLMStepOutput(step, response.output);
				outputs.push(output);
				conversation.push({
					role: "assistant",
					content: response.rawOutput ?? toStreamChunk(output),
				});
			} catch (error) {
				throw convertFromLLMError(error);
			}
		}
		return {
			result: outputs.at(-1),
			tokens: totalTokens,
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
				try {
					const schema = isStructuredOutput(step.output)
						? (step.output.schema as JSONSchema)
						: undefined;
					const response = await client.chat(request, schema);
					const output = normalizeLLMStepOutput(step, response.output);
					outputs.push(output);
					conversation.push({
						role: "assistant",
						content: response.rawOutput ?? toStreamChunk(output),
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

			const { promise: completion, resolve: resolveCompletion } =
				Promise.withResolvers<number>();
			const source = client.chatStream(request);
			return {
				iterator: (async function* () {
					try {
						while (true) {
							throwIfAborted(signal);
							const { done, value } = await source.next();
							if (done) {
								resolveCompletion(value.usage?.completionTokens ?? 0);
								return;
							}
							yield value.content;
						}
					} finally {
						// @ts-expect-error This is fine, since no one is using the value.
						await source.return();
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

		const cacheKey = await computeCacheKey(promptId, modelId, text, ctx);
		let thinCacheState: ThinCacheState | undefined;

		if (options.cleanCache) {
			await resultCache.del(cacheKey);
		}

		if (supportsThinCache && payloadArray) {
			const entryKeys = await Promise.all(
				payloadArray.map((entry) =>
					computeCacheKey(promptId, modelId, entry, ctx),
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
					entryKeys.map((key) => resultCache.get(key)),
				);
				cachedEntries.forEach((value, index) => {
					if (value !== undefined) {
						cacheState.values[index] = value;
					} else {
						cacheState.missing.push(index);
					}
				});
				if (cacheState.missing.length === 0) {
					const cachedValue = cacheState.values.slice();
					await resultCache.set(cacheKey, cachedValue);
					return {
						value: cachedValue,
						completionTokens: 0,
					};
				}
			}
		} else if (!options.cleanCache) {
			const cached = await resultCache.get(cacheKey);
			if (cached !== undefined) {
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

		if (service.type === "traditional") {
			const texts = toTextArray(
				Array.isArray(normalizedPayload)
					? normalizedPayload
					: [normalizedPayload],
			);
			if (texts.length === 0) {
				return { value: expectsArray ? [] : "", completionTokens: 0 };
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
					resultCache.set(thinCacheState.keys[index], merged[index]),
				),
			);
		}

		await resultCache.set(cacheKey, finalValue);
		return { value: finalValue, completionTokens };
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
			const estimated = estimateTokensForService(service, normalized);
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

			return (async function* () {
				const cacheKey = await computeCacheKey(modelId, promptId, text, ctx);
				if (options.cleanCache) {
					await resultCache.del(cacheKey);
				} else {
					const cached = await resultCache.get(cacheKey);
					if (cached) {
						yield toStreamChunk(cached);
						return;
					}
				}
				const queue = queueHub.queue(modelId);
				const estimated = estimateTokensForService(service, normalized);
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
				let aggregate = "";
				try {
					for await (const chunk of iterator) {
						aggregate += chunk;
						yield chunk;
					}
					if (service.type === "llm") {
						await resultCache.set(cacheKey, aggregate);
					} else if (traditionalResult) {
						await resultCache.set(cacheKey, traditionalResult);
					}
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
