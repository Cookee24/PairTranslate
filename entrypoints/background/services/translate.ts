import type * as s from "~/utils/settings";
import { translate as traditionalTranslate } from "~/utils/translate";

/**
 * Handle API errors and convert to TranslateError
 */
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

/**
 * Get model configuration by ID
 */
const getModelConfig = async (
	modelId: string,
): Promise<
	| { type: "llm"; config: s.ModelConfig }
	| {
			type: "traditional";
			config: s.TraditionalTranslationConfig;
			apiSpec: s.TraditionalTranslationConfig["apiSpec"];
	  }
> => {
	const settings = await getSettings();

	const llm = settings.services.llmServices[modelId];
	if (llm) {
		return {
			type: "llm",
			config: llm,
		};
	}

	const traditional = settings.services.traditionalServices[modelId];
	if (traditional) {
		return {
			type: "traditional",
			config: traditional,
			apiSpec: traditional.apiSpec,
		};
	}

	throw createTranslateError(
		TranslateErrorType.MODEL_NOT_FOUND,
		t("errors.modelNotFound", [modelId]),
	);
};

/**
 * Get prompt settings by ID
 */
const getPromptSettings = async (
	promptId: string,
): Promise<s.PromptSettings> => {
	const settings = await getSettings();
	const prompt = settings.prompts[promptId];

	if (!prompt) {
		throw createTranslateError(
			TranslateErrorType.INVALID_PROMPT,
			t("errors.promptNotFound", [promptId]),
		);
	}

	return prompt;
};

/**
 * Create cache manager for translation results
 */
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
		cacheKey: ArrayBuffer,
		cleanCache: boolean,
		apiCall: () => Promise<T>,
	): Promise<T> {
		if (cleanCache) {
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
		cacheKey: ArrayBuffer,
		cleanCache: boolean,
		streamCall: () => AsyncGenerator<string>,
	): AsyncGenerator<string> {
		if (cleanCache) {
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

/**
 * Execute unary translation with traditional service
 */
const executeTraditionalUnary = async (
	config: s.TraditionalTranslationConfig,
	textContext: TextContext,
	sourceLang: string,
	targetLang: string,
): Promise<string> => {
	const { translatedText } = await traditionalTranslate(
		config.apiSpec,
		{
			apiKey: config.apiKey || "",
			apiUrl: config.baseUrl,
		},
		{ text: [textContext.content], sourceLang, targetLang },
	);
	return translatedText[0];
};

/**
 * Execute unary translation with LLM service
 */
const executeLLMUnary = async (
	config: s.ModelConfig,
	promptSettings: s.PromptSettings,
	pageContext: PageContext | undefined,
	textContext: TextContext,
	sourceLang: string,
	targetLang: string,
): Promise<string> => {
	const client = createLLMClient(config.apiSpec, {
		apiKey: config.apiKey || "",
		baseUrl: config.baseUrl,
	});

	const promptContext: PromptContext = {
		targetLang,
		sourceLang,
		page: pageContext,
		textContext,
	};

	const { system, user } = buildPrompt(promptSettings, promptContext);

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

/**
 * Execute streaming translation with LLM service
 */
async function* executeLLMStream(
	config: s.ModelConfig,
	promptSettings: s.PromptSettings,
	pageContext: PageContext | undefined,
	textContext: TextContext,
	sourceLang: string,
	targetLang: string,
): AsyncGenerator<string> {
	const client = createLLMClient(config.apiSpec, {
		apiKey: config.apiKey || "",
		baseUrl: config.baseUrl,
	});

	const promptContext: PromptContext = {
		targetLang,
		sourceLang,
		page: pageContext,
		textContext,
	};

	const { system, user } = buildPrompt(promptSettings, promptContext);

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

/**
 * Execute batch translation with traditional service
 */
const executeTraditionalBatch = async (
	config: s.TraditionalTranslationConfig,
	texts: string[],
	sourceLang: string,
	targetLang: string,
): Promise<string[]> => {
	const { translatedText } = await traditionalTranslate(
		config.apiSpec,
		{
			apiKey: config.apiKey || "",
			apiUrl: config.baseUrl,
		},
		{ text: texts, sourceLang, targetLang },
	);

	return translatedText;
};

/**
 * Execute batch translation with LLM service
 */
const executeLLMBatch = async (
	config: s.ModelConfig,
	promptSettings: s.PromptSettings,
	pageContext: PageContext | undefined,
	texts: string[],
	sourceLang: string,
	targetLang: string,
): Promise<string[]> => {
	if (!isBatchPrompt(promptSettings)) {
		throw createTranslateError(
			TranslateErrorType.INVALID_PROMPT,
			t("errors.promptNotBatch"),
		);
	}

	const client = createLLMClient(config.apiSpec, {
		apiKey: config.apiKey || "",
		baseUrl: config.baseUrl,
	});

	const promptContext: PromptContext = {
		targetLang,
		sourceLang,
		page: pageContext,
		texts,
	};

	const { system, user } = buildPrompt(promptSettings, promptContext);

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
	const result = parseBatchResponse(response.content, promptSettings);

	if (result.length !== texts.length) {
		throw createTranslateError(
			TranslateErrorType.API_ERROR,
			t("errors.batchResponseMismatch", [texts.length, result.length]),
		);
	}

	return result;
};

/**
 * Handle batch caching logic
 */
const handleBatchCaching = async (
	texts: string[],
	options: TranslateOptions,
	pageContext: PageContext | undefined,
	cacheManager: ReturnType<typeof createCacheManager>,
) => {
	const results: string[] = [];
	const uncachedIndices: number[] = [];
	const uncachedTexts: string[] = [];

	for (let i = 0; i < texts.length; i++) {
		const text = texts[i];
		const textContext: TextContext = {
			content: text,
			before: "",
			after: "",
		};

		const cacheKey = await generateCacheKey(
			options.promptId,
			options.modelId,
			textContext,
			pageContext,
		);

		if (options.cleanCache) {
			await cacheManager.del(cacheKey);
			uncachedIndices.push(i);
			uncachedTexts.push(text);
			results.push(""); // Placeholder
		} else {
			const cachedResult = await cacheManager.get(cacheKey);
			if (cachedResult) {
				results.push(cachedResult);
			} else {
				uncachedIndices.push(i);
				uncachedTexts.push(text);
				results.push(""); // Placeholder
			}
		}
	}

	return { results, uncachedIndices, uncachedTexts };
};

/**
 * Cache batch results
 */
const cacheBatchResults = async (
	results: string[],
	uncachedIndices: number[],
	translatedTexts: string[],
	texts: string[],
	options: TranslateOptions,
	pageContext: PageContext | undefined,
	cacheManager: ReturnType<typeof createCacheManager>,
) => {
	for (let i = 0; i < uncachedIndices.length; i++) {
		const originalIndex = uncachedIndices[i];
		const translatedText = translatedTexts[i];
		results[originalIndex] = translatedText;

		const textContext: TextContext = {
			content: texts[originalIndex],
			before: "",
			after: "",
		};

		const cacheKey = await generateCacheKey(
			options.promptId,
			options.modelId,
			textContext,
			pageContext,
		);

		await cacheManager.set(cacheKey, translatedText);
	}
};

/**
 * Main service factory
 */
export const createTranslateService = async (): Promise<TranslateService> => {
	const cacheStorage = createLRUStorage<string>(
		"translate-cache",
		STORAGE_KEYS.cache,
		(await getSettings()).translate.cacheSize,
	);
	const cacheManager = createCacheManager(cacheStorage);

	return {
		unary: async (
			context: [PageContext | undefined, TextContext],
			options: TranslateOptions,
		): Promise<string> => {
			const [pageContext, textContext] = context;
			const modelConfig = await getModelConfig(options.modelId);
			const promptSettings = await getPromptSettings(options.promptId);

			const cacheKey = await generateCacheKey(
				options.promptId,
				options.modelId,
				textContext,
				pageContext,
			);

			try {
				return await cacheManager.withCache(
					cacheKey,
					options.cleanCache ?? false,
					async () => {
						if (modelConfig.type === "traditional") {
							return await executeTraditionalUnary(
								modelConfig.config,
								textContext,
								options.sourceLang,
								options.targetLang,
							);
						}

						return await executeLLMUnary(
							modelConfig.config,
							promptSettings,
							pageContext,
							textContext,
							options.sourceLang,
							options.targetLang,
						);
					},
				);
			} catch (error) {
				handleApiError(error);
				throw error; // Unreachable but satisfies TypeScript
			}
		},

		stream: async function* (
			context: [PageContext | undefined, TextContext],
			options: TranslateOptions,
		): AsyncGenerator<string> {
			const [pageContext, textContext] = context;
			const modelConfig = await getModelConfig(options.modelId);
			const promptSettings = await getPromptSettings(options.promptId);

			const cacheKey = await generateCacheKey(
				options.promptId,
				options.modelId,
				textContext,
				pageContext,
			);

			try {
				if (modelConfig.type === "traditional") {
					// Traditional services don't support streaming, yield full result
					const result = await cacheManager.withCache(
						cacheKey,
						options.cleanCache ?? false,
						async () => {
							return await executeTraditionalUnary(
								modelConfig.config,
								textContext,
								options.sourceLang,
								options.targetLang,
							);
						},
					);
					yield result;
					return;
				}

				// Stream from LLM
				yield* cacheManager.withStreamingCache(
					cacheKey,
					options.cleanCache ?? false,
					() =>
						executeLLMStream(
							modelConfig.config,
							promptSettings,
							pageContext,
							textContext,
							options.sourceLang,
							options.targetLang,
						),
				);
			} catch (error) {
				handleApiError(error);
			}
		},

		batch: async (
			context: [PageContext | undefined, string[]],
			options: TranslateOptions,
		): Promise<string[]> => {
			const [pageContext, texts] = context;
			const modelConfig = await getModelConfig(options.modelId);
			const promptSettings = await getPromptSettings(options.promptId);

			const { results, uncachedIndices, uncachedTexts } =
				await handleBatchCaching(texts, options, pageContext, cacheManager);

			// If all texts are cached, return immediately
			if (uncachedIndices.length === 0) {
				return results;
			}

			try {
				// Translate uncached texts
				let translatedTexts: string[];

				if (modelConfig.type === "traditional") {
					translatedTexts = await executeTraditionalBatch(
						modelConfig.config,
						uncachedTexts,
						options.sourceLang,
						options.targetLang,
					);
				} else {
					translatedTexts = await executeLLMBatch(
						modelConfig.config,
						promptSettings,
						pageContext,
						uncachedTexts,
						options.sourceLang,
						options.targetLang,
					);
				}

				// Cache and update results
				await cacheBatchResults(
					results,
					uncachedIndices,
					translatedTexts,
					texts,
					options,
					pageContext,
					cacheManager,
				);

				return results;
			} catch (error) {
				handleApiError(error);
				throw error; // Unreachable but satisfies TypeScript
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
