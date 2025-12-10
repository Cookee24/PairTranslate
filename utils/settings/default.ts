import { MS_TRANSLATOR_ID, PROMPT_ID } from "~/utils/constants";
import { t } from "~/utils/i18n";
import { getTargetLanguage } from "~/utils/language";
import { getDefaultModifierKey } from "~/utils/modifier";
import {
	BATCH,
	DICTIONARY,
	EXPLAIN,
	EXPLAIN_SCHEMA,
	INPUT,
	UNARY,
} from "~/utils/prompt";
import type * as s from "./def";
import { SETTINGS_VERSION } from "./def";

/**
 * Generate default basic settings
 */
export function generateBasicSettings(): s.BasicSettings {
	return {
		enabled: true,
		theme: "system",
		selectionPopupEnabled: true,
		autoPin: false,
		floatingBallEnabled: true,
		floatingBallPosition: {
			side: "right",
			top: 20,
		},
		keyboardShortcutEnabled: true,
		keyboardShortcut: "Alt+T",
		selectionTranslateEnabled: true,
		selectionTranslateModifier: getDefaultModifierKey(),
		inputTranslateEnabled: true,
		progressIndicationEnabled: true,
		translationStyle: {
			bold: false,
			italic: false,
			underline: false,
		},
	};
}

/**
 * Generate default translation settings with browser language detection
 */
export function generateTranslateSettings(): s.TranslateSettings {
	const targetLang = getTargetLanguage();

	return {
		sourceLang: "auto",
		targetLang: targetLang,
		filterInteractive: true,
		translationMode: "parallel",
		translateFullPage: false,
		inTextTranslateModel: MS_TRANSLATOR_ID,
		floatingTranslateModel: MS_TRANSLATOR_ID,
		floatingExplainModel: undefined,
		inputTranslateModel: MS_TRANSLATOR_ID,
		inputTranslateLang: "en",
	};
}

export function generateServicesSettings(): s.ServicesSettings {
	const supportBrowserTranslator =
		"Translator" in globalThis && "LanguageDetector" in globalThis;
	const services: s.ServicesSettings = {
		[MS_TRANSLATOR_ID]: {
			name: t("services.microsoftTranslatorDefault"),
			type: "traditional",
			apiSpec: "microsoft",
			apiKey: "edge",
		},
	};

	if (supportBrowserTranslator) {
		services["5b02ae2c-9a84-491c-830d-53a99227e03d"] = {
			name: t("settings.browserTranslator.serviceName"),
			type: "traditional",
			apiSpec: "browser",
		};
	}

	return services;
}

export function generateWebsiteRuleSettings(): s.WebsiteRulesSettings {
	return [];
}

export function generateQueueControlSettings(): s.QueueControlSettings {
	return {
		requestConcurrency: 4,
		tokensPerMinute: 60000,
		maxBatchSize: 8,
		maxTokensPerBatch: 8000,
		cacheSize: 1000,
	};
}

export function generateDebugSettings(): s.DebugSettings {
	return {
		verboseLogging: import.meta.env.DEV,
		traceLlms: false,
		traceTraditional: false,
		disableCache: false,
		simulateLatencyMs: 0,
	};
}

export function generatePromptSettings(): s.PromptsSettings {
	return {
		[PROMPT_ID.translate]: {
			name: t("prompts.defaultNames.translate"),
			systemPrompt: UNARY().system,
			input: "string",
			output: "string",
			steps: [
				{
					message: UNARY().user,
					output: "string",
				},
			],
		},
		[PROMPT_ID.batchTranslate]: {
			name: t("prompts.defaultNames.batchTranslate"),
			systemPrompt: BATCH().system,
			input: "stringArray",
			output: "structured",
			steps: [
				{
					message: BATCH().user,
					output: {
						type: "stringArray",
						delimiter: {
							type: "regex",
							pattern: "^==== \\d+",
							flags: "gm",
						},
					},
				},
			],
		},
		[PROMPT_ID.inputTranslate]: {
			name: t("prompts.defaultNames.inputTranslate"),
			systemPrompt: INPUT().system,
			input: "string",
			output: "string",
			steps: [
				{
					message: INPUT().user,
					output: "string",
				},
			],
		},
		[PROMPT_ID.dictionaryTranslate]: {
			name: t("prompts.defaultNames.dictionaryTranslate"),
			systemPrompt: DICTIONARY().system,
			input: "string",
			output: "string",
			steps: [
				{
					message: DICTIONARY().user,
					output: "string",
				},
			],
		},
		[PROMPT_ID.explain]: {
			name: t("prompts.defaultNames.explain"),
			systemPrompt: EXPLAIN().system,
			input: "string",
			output: "structured",
			steps: [
				{
					message: EXPLAIN().user,
					output: {
						type: "structured",
						schema: EXPLAIN_SCHEMA(),
					},
				},
			],
		},
	};
}

/**
 * Generate complete default settings
 */
export function generateDefaultSettings(): s.SettingsSchema {
	return {
		__v: SETTINGS_VERSION,
		basic: generateBasicSettings(),
		translate: generateTranslateSettings(),
		services: generateServicesSettings(),
		websiteRules: generateWebsiteRuleSettings(),
		queue: generateQueueControlSettings(),
		prompts: generatePromptSettings(),
		debug: generateDebugSettings(),
	};
}

/**
 * Get browser-specific target language
 */
export function getBrowserTargetLanguage(): string {
	return getTargetLanguage();
}

export const LLMServiceTemplates = [
	{
		type: "llm" as const,
		name: t("templates.llm.openai"),
		baseUrl: "https://api.openai.com/v1",
		apiSpec: "openai" as const,
	},
	{
		type: "llm" as const,
		name: t("templates.llm.azureOpenai"),
		baseUrl: "https://{your-resource-name}.openai.azure.com",
		apiSpec: "openai" as const,
	},
	{
		type: "llm" as const,
		name: t("templates.llm.anthropic"),
		baseUrl: "https://api.anthropic.com",
		apiSpec: "anthropic" as const,
	},
	{
		type: "llm" as const,
		name: t("templates.llm.googleGemini"),
		baseUrl: "https://generativelanguage.googleapis.com",
		apiSpec: "google" as const,
	},
	{
		type: "llm" as const,
		name: t("templates.llm.lmStudio"),
		baseUrl: "http://localhost:1234/v1",
		apiSpec: "openai" as const,
	},
	{
		type: "llm" as const,
		name: t("templates.llm.ollama"),
		baseUrl: "http://localhost:11434",
		apiSpec: "openai" as const,
	},
	{
		type: "llm" as const,
		name: t("templates.llm.openRouter"),
		baseUrl: "https://openrouter.ai/api/v1",
		apiSpec: "openai" as const,
	},
	{
		type: "llm" as const,
		name: t("templates.llm.cohere"),
		baseUrl: "https://api.cohere.com",
		apiSpec: "openai" as const,
	},
	{
		type: "llm" as const,
		name: t("templates.llm.huggingFaceInference"),
		baseUrl: "https://api-inference.huggingface.co",
		apiSpec: "openai" as const,
	},
	{
		type: "llm" as const,
		name: t("templates.llm.ai21Labs"),
		baseUrl: "https://api.ai21.com/studio/v1",
		apiSpec: "openai" as const,
	},
	{
		type: "llm" as const,
		name: t("templates.llm.mistral"),
		baseUrl: "https://api.mistral.ai",
		apiSpec: "openai" as const,
	},
	{
		type: "llm" as const,
		name: t("templates.llm.stabilityAI"),
		baseUrl: "https://api.stability.ai",
		apiSpec: "openai" as const,
	},
	{
		type: "llm" as const,
		name: t("templates.llm.replicate"),
		baseUrl: "https://api.replicate.com",
		apiSpec: "openai" as const,
	},
	{
		type: "llm" as const,
		name: t("templates.llm.alephAlpha"),
		baseUrl: "https://api.aleph-alpha.com",
		apiSpec: "openai" as const,
	},
	{
		type: "llm" as const,
		name: t("templates.llm.glm"),
		baseUrl: "https://open.bigmodel.cn/api/paas/v4",
		apiSpec: "openai" as const,
	},
	{
		type: "llm" as const,
		name: t("templates.llm.deepseek"),
		baseUrl: "https://api.deepseek.com",
		apiSpec: "openai" as const,
	},
	{
		type: "llm" as const,
		name: t("templates.llm.other"),
		baseUrl: "",
		apiSpec: "openai" as const,
	},
] satisfies Array<Extract<s.ServiceSettings, { type: "llm" }>>;
