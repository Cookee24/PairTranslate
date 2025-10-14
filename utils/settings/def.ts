import z from "zod";

export const FloatingBallPosition = z.object({
	side: z.enum(["left", "right"]).default("right"),
	top: z.number().min(0).max(100).default(20), // Percentage of viewport height
});

export const BasicSettings = z.object({
	enabled: z.boolean().default(true),
	theme: z.enum(["light", "dark", "system"]).default("system"),
	showTip: z.boolean().default(true),
	autoPin: z.boolean().default(false),
	floatingBallEnabled: z.boolean().default(true),
	floatingBallPosition: FloatingBallPosition.default(
		FloatingBallPosition.parse({}),
	),
	keyboardShortcutEnabled: z.boolean().default(true),
	keyboardShortcut: z.string().default("Alt+T"),
});

export const ModelConfig = z.object({
	name: z.string().min(1),
	baseUrl: z.string().url(),
	apiSpec: z.enum(["openai", "anthropic", "google"]).default("openai"),
	apiKey: z.string().optional(),
	model: z.string(),
	temperature: z.number().optional(),
	maxOutputTokens: z.number().optional(),
});

export const TraditionalTranslationConfig = z.object({
	name: z.string().min(1),
	baseUrl: z.string().url().optional(),
	apiSpec: z.enum(["microsoft", "google", "deepl"]).default("microsoft"),
	apiKey: z.string().optional(),
	region: z.string().optional(),
});

export const TranslateSettings = z.object({
	concurrentRequests: z.number().min(1).default(8),
	cacheSize: z.number().min(0).default(4096), // Number of entries in LRU cache
	maxBatchSize: z.number().min(1).max(100).default(4),
	sourceLang: z.string().default("auto"),
	targetLang: z.string().default("en"), // Default fallback, will be overridden by browser detection
	filterTargetLanguage: z.boolean().default(true), // Skip text already in target language
	filterInteractive: z.boolean().default(true), // Skip interactive elements like buttons, headers, navigation
	translationMode: z.enum(["parallel", "replace"]).default("parallel"), // Translation display mode: parallel (side-by-side) or replace (hide original)
	inTextTranslateModel: z.uuid().optional(),
	floatingTranslateModel: z.uuid().optional(),
	floatingExplainModel: z.uuid().optional(),
});

export const ServicesSettings = z.object({
	llmServices: z.record(z.uuid(), ModelConfig).default({}),
	traditionalServices: z
		.record(z.uuid(), TraditionalTranslationConfig)
		.default({}),
});

export const SettingsSchema = z.object({
	basic: BasicSettings,
	translate: TranslateSettings,
	services: ServicesSettings,
});
