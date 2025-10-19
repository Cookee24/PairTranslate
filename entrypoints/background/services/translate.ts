import type z from "zod";
import { translate as traditionalTranslate } from "~/utils/translate";
import {
	convertFromLLMError,
	convertFromTranslationError,
	convertGenericError,
	createTranslateError,
	isTranslateError,
	TranslateErrorType,
} from "../utils/errors";
import { settingsStore } from "../utils/settings";

const buildPageContextString = (pageContext?: PageContext): string => {
	if (!pageContext) return "";

	let content = `\nTitle: ${pageContext.pageTitle}`;
	content += `\nDomain: ${pageContext.domain}`;

	if (pageContext.pageDescription) {
		content += `\nDescription: ${pageContext.pageDescription}`;
	}

	if (pageContext.pageKeywords?.length) {
		content += `\nKeywords: ${pageContext.pageKeywords.join(", ")}`;
	}

	for (const [key, value] of Object.entries(pageContext.extra || {})) {
		content += `\n${key}: ${value}`;
	}

	return content;
};

const buildUserPrompt = (
	textContext: TextContext,
	pageContext?: PageContext,
): string => {
	let user = `<${TAGS.page}>`;
	user += buildPageContextString(pageContext);
	user += `</${TAGS.page}>`;

	if (textContext.before) {
		user += `\n\n<${TAGS.context} before>${textContext.before}</${TAGS.context}>`;
	}
	if (textContext.after) {
		user += `\n<${TAGS.context} after>${textContext.after}</${TAGS.context}>`;
	}
	user += `\n<${TAGS.content}>${textContext.content}</${TAGS.content}>`;

	return user;
};

const buildPrompt = (
	promptTemplate: string,
	targetLang: string,
	textContext: TextContext,
	pageContext?: PageContext,
): { system: string; user: string } => {
	const system = promptTemplate.replaceAll(
		`{{${REPLACEMENT.targetLang}}}`,
		getNativeName(targetLang),
	);
	const user = buildUserPrompt(textContext, pageContext);
	return { system, user };
};

const buildBatchPrompt = (
	texts: string[],
	targetLang: string,
	pageContext?: PageContext,
): { system: string; user: string } => {
	let user = `<${TAGS.page}>`;
	user += buildPageContextString(pageContext);
	user += `</${TAGS.page}>`;

	// Add each text as a section
	texts.forEach((text, index) => {
		user += `\n@@P${index + 1}\n${text}`;
	});

	const system = BATCH_TRANSLATE_PROMPT.replaceAll(
		`{{${REPLACEMENT.targetLang}}}`,
		getNativeName(targetLang),
	);

	return { system, user };
};

const handleApiError = (error: unknown): never => {
	if (isTranslateError(error)) {
		throw error;
	}

	try {
		throw convertFromLLMError(error);
	} catch (llmError) {
		if (isTranslateError(llmError)) throw llmError;
		try {
			throw convertFromTranslationError(error);
		} catch (translationError) {
			if (isTranslateError(translationError)) throw translationError;
			throw convertGenericError(error);
		}
	}
};

const emptyContext = (content: string): TextContext => ({
	content,
	before: "",
	after: "",
});

const getModelConfig = (modelId: string) => {
	const settings = settingsStore.get();

	const llm = settings.services.llmServices[modelId];
	if (llm) {
		return {
			...llm,
			type: "llm" as const,
			apiSpec: llm.apiSpec as LLMProvider,
		};
	}

	const traditional = settings.services.traditionalServices[modelId];
	if (traditional) {
		return {
			...traditional,
			type: "traditional" as const,
			apiSpec: traditional.apiSpec as "google" | "microsoft" | "deepl",
		};
	}

	throw createTranslateError(
		TranslateErrorType.MODEL_NOT_FOUND,
		t("errors.modelNotFound", [modelId]),
	);
};

const createCacheManager = (
	cacheStorage: import("~/utils/storage").Storage<string>,
) => ({
	async get(cacheKey: ArrayBuffer): Promise<string | null> {
		try {
			return (await cacheStorage.get(cacheKey)) ?? null;
		} catch (error) {
			throw createTranslateError(
				TranslateErrorType.CACHE_ERROR,
				t("errors.cacheRetrieveFailed"),
				undefined,
				{
					originalError: error instanceof Error ? error.message : String(error),
				},
			);
		}
	},

	async set(cacheKey: ArrayBuffer, result: string): Promise<void> {
		try {
			await cacheStorage.set(cacheKey, result);
		} catch (error) {
			console.warn("Failed to cache result:", error);
		}
	},

	async del(cacheKey: ArrayBuffer): Promise<void> {
		try {
			await cacheStorage.del(cacheKey);
		} catch (error) {
			console.warn("Failed to clean cache entry:", error);
		}
	},

	async withCache<T>(
		params: {
			operation: string;
			modelId: string;
			textContext: TextContext;
			pageContext?: PageContext;
			cleanCache?: boolean;
		},
		apiCall: () => Promise<T>,
	): Promise<T> {
		const cacheKey = await generateCacheKey(
			params.operation,
			params.modelId,
			params.textContext,
			params.pageContext,
		);

		if (params.cleanCache) {
			await this.del(cacheKey);
		} else {
			const cachedResult = await this.get(cacheKey);
			if (cachedResult) return cachedResult as T;
		}

		const result = await apiCall();
		if (typeof result === "string") {
			await this.set(cacheKey, result);
		}
		return result;
	},

	async *withStreamingCache(
		params: {
			operation: string;
			modelId: string;
			textContext: TextContext;
			pageContext?: PageContext;
			cleanCache?: boolean;
		},
		streamCall: () => AsyncGenerator<string>,
	): AsyncGenerator<string> {
		const cacheKey = await generateCacheKey(
			params.operation,
			params.modelId,
			params.textContext,
			params.pageContext,
		);

		if (params.cleanCache) {
			await this.del(cacheKey);
		} else {
			const cachedResult = await this.get(cacheKey);
			if (cachedResult) {
				yield cachedResult;
				return;
			}
		}

		let fullResult = "";
		for await (const chunk of streamCall()) {
			fullResult += chunk;
			yield chunk;
		}
		await this.set(cacheKey, fullResult);
	},
});

const executeTraditionalTranslation = async (
	config: z.infer<typeof TraditionalTranslationConfig>,
	operation: "translate" | "explain",
	textContext: TextContext,
	targetLang: string,
): Promise<string> => {
	if (operation === "explain") {
		throw createTranslateError(
			TranslateErrorType.UNSUPPORTED_OPERATION,
			t("errors.explainOnlyLlm"),
		);
	}

	const { translatedText } = await traditionalTranslate(
		config.apiSpec,
		{
			apiKey: config.apiKey || "",
			apiUrl: config.baseUrl,
		},
		{ text: [textContext.content], sourceLang: "auto", targetLang },
	);
	return translatedText[0];
};

const executeLLMTranslation = async (
	config: z.infer<typeof ModelConfig>,
	operation: "translate" | "explain",
	textContext: TextContext,
	pageContext: PageContext | undefined,
	targetLang: string,
): Promise<string> => {
	const client = createLLMClient(config.apiSpec, {
		apiKey: config.apiKey || "",
		baseUrl: config.baseUrl,
	});

	const promptTemplate =
		operation === "translate" ? TRANSLATE_PROMPT : EXPLAIN_PROMPT;
	const { system, user } = buildPrompt(
		promptTemplate,
		targetLang,
		textContext,
		pageContext,
	);

	const request: UnifiedChatRequest = {
		model: config.model,
		messages: [
			{ role: "system", content: system },
			{ role: "user", content: user },
		],
		temperature: config.temperature,
		maxTokens: config.maxOutputTokens,
	};

	const response = await client.chat(request);
	return response.content;
};

const executeApiCall = async (
	operation: "translate" | "explain",
	modelId: string,
	textContext: TextContext,
	pageContext?: PageContext,
): Promise<string> => {
	const config = getModelConfig(modelId);
	const targetLang = settingsStore.get().translate.targetLang;

	try {
		if (config.type === "traditional") {
			return await executeTraditionalTranslation(
				config,
				operation,
				textContext,
				targetLang,
			);
		}

		return await executeLLMTranslation(
			config,
			operation,
			textContext,
			pageContext,
			targetLang,
		);
	} catch (error) {
		handleApiError(error);
		throw "Unreachable code"; // Make tsc happy
	}
};

const executeBatchTraditionalTranslation = async (
	config: z.infer<typeof TraditionalTranslationConfig>,
	text: string[],
	targetLang: string,
): Promise<string[]> => {
	const { translatedText } = await traditionalTranslate(
		config.apiSpec,
		{
			apiKey: config.apiKey || "",
			apiUrl: config.baseUrl,
		},
		{ text: text, sourceLang: "auto", targetLang },
	);

	return translatedText;
};

const executeBatchLLMTranslation = async (
	config: z.infer<typeof ModelConfig>,
	texts: string[],
	pageContext: PageContext | undefined,
	targetLang: string,
): Promise<string[]> => {
	const client = createLLMClient(config.apiSpec, {
		apiKey: config.apiKey || "",
		baseUrl: config.baseUrl,
	});

	const { system, user } = buildBatchPrompt(texts, targetLang, pageContext);

	const request: UnifiedChatRequest = {
		model: config.model,
		messages: [
			{ role: "system", content: system },
			{ role: "user", content: user },
		],
		temperature: config.temperature,
		maxTokens: config.maxOutputTokens,
	};

	const response = await client.chat(request);

	// Parse the response to extract individual translations
	const sections = response.content.split(/@@P\d+/).slice(1);
	return sections.map((section) => section.trim());
};

const executeBatchApiCall = async (
	modelId: string,
	texts: string[],
	pageContext?: PageContext,
): Promise<string[]> => {
	const config = getModelConfig(modelId);
	const targetLang = settingsStore.get().translate.targetLang;

	try {
		let result: string[];
		if (config.type === "traditional") {
			result = await executeBatchTraditionalTranslation(
				config,
				texts,
				targetLang,
			);
		} else {
			result = await executeBatchLLMTranslation(
				config,
				texts,
				pageContext,
				targetLang,
			);
		}

		if (result.length !== texts.length) {
			throw createTranslateError(
				TranslateErrorType.API_ERROR,
				t("errors.batchResponseMismatch", [texts.length, result.length]),
			);
		}

		return result;
	} catch (error) {
		handleApiError(error);
		throw "Unreachable code"; // Make tsc happy
	}
};

// --- Streaming Functions ---
async function* streamTraditionalTranslation(
	operation: "translate" | "explain",
	modelId: string,
	textContext: TextContext,
	pageContext?: PageContext,
): AsyncGenerator<string> {
	if (operation === "explain") {
		throw createTranslateError(
			TranslateErrorType.UNSUPPORTED_OPERATION,
			t("errors.explainOnlyLlm"),
		);
	}

	// Traditional services don't stream, so we yield the full result once.
	const result = await executeApiCall(
		"translate",
		modelId,
		textContext,
		pageContext,
	);
	yield result;
}

async function* streamLLMTranslation(
	config: z.infer<typeof ModelConfig>,
	operation: "translate" | "explain",
	textContext: TextContext,
	pageContext: PageContext | undefined,
	targetLang: string,
): AsyncGenerator<string> {
	const client = createLLMClient(config.apiSpec, {
		apiKey: config.apiKey || "",
		baseUrl: config.baseUrl,
	});

	const promptTemplate =
		operation === "translate" ? TRANSLATE_PROMPT : EXPLAIN_PROMPT;
	const { system, user } = buildPrompt(
		promptTemplate,
		targetLang,
		textContext,
		pageContext,
	);

	const request: UnifiedChatRequest = {
		model: config.model,
		messages: [
			{ role: "system", content: system },
			{ role: "user", content: user },
		],
		temperature: config.temperature,
		maxTokens: config.maxOutputTokens,
		stream: true,
	};

	const stream = client.chatStream(request);
	for await (const chunk of stream) {
		yield chunk.content;
	}
}

async function* streamApiCall(
	operation: "translate" | "explain",
	modelId: string,
	textContext: TextContext,
	pageContext?: PageContext,
): AsyncGenerator<string> {
	const config = getModelConfig(modelId);
	const targetLang = settingsStore.get().translate.targetLang;

	try {
		if (config.type === "traditional") {
			yield* streamTraditionalTranslation(
				operation,
				modelId,
				textContext,
				pageContext,
			);
			return;
		}

		yield* streamLLMTranslation(
			config,
			operation,
			textContext,
			pageContext,
			targetLang,
		);
	} catch (error) {
		handleApiError(error);
	}
}

const handleBatchCaching = async (
	texts: string[],
	modelId: string,
	pageContext: PageContext | undefined,
	cleanCache: boolean,
	cacheManager: ReturnType<typeof createCacheManager>,
) => {
	const results: string[] = [];
	const uncachedIndices: number[] = [];
	const uncachedTexts: string[] = [];

	for (let i = 0; i < texts.length; i++) {
		const textContext = emptyContext(texts[i]);
		const cacheKey = await generateCacheKey(
			"translate",
			modelId,
			textContext,
			pageContext,
		);

		if (cleanCache) {
			await cacheManager.del(cacheKey);
			uncachedIndices.push(i);
			uncachedTexts.push(texts[i]);
			results.push(""); // Placeholder
		} else {
			const cachedResult = await cacheManager.get(cacheKey);
			if (cachedResult) {
				results.push(cachedResult);
			} else {
				uncachedIndices.push(i);
				uncachedTexts.push(texts[i]);
				results.push(""); // Placeholder
			}
		}
	}

	return { results, uncachedIndices, uncachedTexts };
};

const cacheBatchResults = async (
	results: string[],
	uncachedIndices: number[],
	translatedTexts: string[],
	texts: string[],
	modelId: string,
	pageContext: PageContext | undefined,
	cacheManager: ReturnType<typeof createCacheManager>,
) => {
	for (let i = 0; i < uncachedIndices.length; i++) {
		const originalIndex = uncachedIndices[i];
		const translatedText = translatedTexts[i];

		results[originalIndex] = translatedText;

		// Cache the individual result
		const textContext = emptyContext(texts[originalIndex]);
		const cacheKey = await generateCacheKey(
			"translate",
			modelId,
			textContext,
			pageContext,
		);
		await cacheManager.set(cacheKey, translatedText);
	}
};

// --- Main Service Factory ---
export const createTranslateService = (): TranslateService => {
	const cacheSize = settingsStore.get().translate.cacheSize;
	const cacheStorage = createLRUStorage<string>(
		"translate-cache",
		STORAGE_KEYS.cache,
		cacheSize,
	);
	const cacheManager = createCacheManager(cacheStorage);

	const createCacheParams = (
		operation: string,
		modelId: string,
		textContext: TextContext,
		pageContext?: PageContext,
		cleanCache = false,
	) => ({
		operation,
		modelId,
		textContext,
		pageContext,
		cleanCache,
	});

	return {
		translate: (
			modelId,
			textContext,
			pageContext,
			options: TranslateOptions = {},
		) => {
			const params = createCacheParams(
				"translate",
				modelId,
				textContext,
				pageContext,
				options.cleanCache,
			);
			return cacheManager.withCache(params, () =>
				executeApiCall("translate", modelId, textContext, pageContext),
			);
		},

		streamTranslate: (
			modelId,
			textContext,
			pageContext,
			options: TranslateOptions = {},
		) => {
			const params = createCacheParams(
				"translate",
				modelId,
				textContext,
				pageContext,
				options.cleanCache,
			);
			return cacheManager.withStreamingCache(params, () =>
				streamApiCall("translate", modelId, textContext, pageContext),
			);
		},

		explain: (
			modelId,
			textContext,
			pageContext,
			options: TranslateOptions = {},
		) => {
			const params = createCacheParams(
				"explain",
				modelId,
				textContext,
				pageContext,
				options.cleanCache,
			);
			return cacheManager.withCache(params, () =>
				executeApiCall("explain", modelId, textContext, pageContext),
			);
		},

		streamExplain: (
			modelId,
			textContext,
			pageContext,
			options: TranslateOptions = {},
		) => {
			const params = createCacheParams(
				"explain",
				modelId,
				textContext,
				pageContext,
				options.cleanCache,
			);
			return cacheManager.withStreamingCache(params, () =>
				streamApiCall("explain", modelId, textContext, pageContext),
			);
		},

		batchTranslate: async (
			modelId: string,
			texts: string[],
			pageContext?: PageContext,
			options: TranslateOptions = {},
		): Promise<string[]> => {
			const { cleanCache = false } = options;

			const { results, uncachedIndices, uncachedTexts } =
				await handleBatchCaching(
					texts,
					modelId,
					pageContext,
					cleanCache,
					cacheManager,
				);

			// If all texts are cached, return immediately
			if (uncachedIndices.length === 0) {
				return results;
			}

			// Translate uncached texts
			const translatedTexts = await executeBatchApiCall(
				modelId,
				uncachedTexts,
				pageContext,
			);

			// Cache and update results
			await cacheBatchResults(
				results,
				uncachedIndices,
				translatedTexts,
				texts,
				modelId,
				pageContext,
				cacheManager,
			);

			return results;
		},

		streamInputTranslate: async function* (
			modelId: string,
			text: string,
			pageContext?: PageContext,
			targetLang?: string,
		): AsyncGenerator<string> {
			const config = getModelConfig(modelId);
			const effectiveTargetLang =
				targetLang ||
				settingsStore.get().translate.inputTranslateLang ||
				settingsStore.get().translate.targetLang;

			if (config.type === "traditional") {
				// Traditional services don't support streaming for input translation
				const { translatedText } = await traditionalTranslate(
					config.apiSpec,
					{
						apiKey: config.apiKey || "",
						apiUrl: config.baseUrl,
					},
					{ text: [text], sourceLang: "auto", targetLang: effectiveTargetLang },
				);
				yield translatedText[0];
				return;
			}

			// LLM-based streaming translation for input
			const client = createLLMClient(config.apiSpec, {
				apiKey: config.apiKey || "",
				baseUrl: config.baseUrl,
			});

			const system = INPUT_TRANSLATE_PROMPT.replaceAll(
				`{{${REPLACEMENT.targetLang}}}`,
				getNativeName(effectiveTargetLang),
			);

			let user = `<${TAGS.page}>`;
			user += buildPageContextString(pageContext);
			user += `</${TAGS.page}>`;
			user += `\n<${TAGS.content}>${text}</${TAGS.content}>`;

			const request: UnifiedChatRequest = {
				model: config.model,
				messages: [
					{ role: "system", content: system },
					{ role: "user", content: user },
				],
				temperature: config.temperature,
				maxTokens: config.maxOutputTokens,
				stream: true,
			};

			try {
				const stream = client.chatStream(request);
				for await (const chunk of stream) {
					yield chunk.content;
				}
			} catch (error) {
				handleApiError(error);
			}
		},

		clearCache: async () => {
			try {
				await cacheStorage.clear();
			} catch (error) {
				console.error("Error clearing cache:", error);
				throw error;
			}
		},
	};
};
