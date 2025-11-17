import z from "zod";

export const FloatingBallPosition = z.object({
	side: z.enum(["left", "right"]).default("right"),
	top: z.number().min(0).max(100).default(20), // Percentage of viewport height
});
export type FloatingBallPosition = z.infer<typeof FloatingBallPosition>;

export const BasicSettings = z.object({
	enabled: z.boolean().default(true),
	theme: z.enum(["light", "dark", "system"]).default("system"),
	selectionPopupEnabled: z.boolean().default(true),
	autoPin: z.boolean().default(false),
	floatingBallEnabled: z.boolean().default(true),
	floatingBallPosition: FloatingBallPosition.default(
		FloatingBallPosition.parse({}),
	),
	keyboardShortcutEnabled: z.boolean().default(true),
	keyboardShortcut: z.string().default("Alt+T"),
	selectionTranslateEnabled: z.boolean().default(true),
	inputTranslateEnabled: z.boolean().default(true),
	progressIndicationEnabled: z.boolean().default(true),
});
export type BasicSettings = z.infer<typeof BasicSettings>;

export const ModelConfig = z.object({
	name: z.string().min(1),
	baseUrl: z.string().url(),
	apiSpec: z.enum(["openai", "anthropic", "google"]).default("openai"),
	apiKey: z.string().optional(),
	model: z.string(),
	temperature: z.number().optional(),
	maxOutputTokens: z.number().optional(),
});
export type ModelConfig = z.infer<typeof ModelConfig>;

export const TraditionalTranslationConfig = z.object({
	name: z.string().min(1),
	baseUrl: z.string().url().optional(),
	apiSpec: z
		.enum(["microsoft", "google", "deepl", "deeplx", "browser"])
		.default("microsoft"),
	apiKey: z.string().optional(),
	region: z.string().optional(),
});
export type TraditionalTranslationConfig = z.infer<
	typeof TraditionalTranslationConfig
>;

export const TranslateSettings = z.object({
	concurrentRequests: z.number().min(1).default(8),
	cacheSize: z.number().min(0).default(4096), // Number of entries in LRU cache
	maxBatchSize: z.number().min(1).max(100).default(4),
	sourceLang: z.string().default("auto"),
	targetLang: z.string().default("en"), // Default fallback, will be overridden by browser detection
	filterInteractive: z.boolean().default(true), // Skip interactive elements like buttons, headers, navigation
	translationMode: z.enum(["parallel", "replace"]).default("parallel"), // Translation display mode: parallel (side-by-side) or replace (hide original)
	translateFullPage: z.boolean().default(false), // Translate entire page content instead of only visible content
	inTextTranslateModel: z.uuid().optional(),
	floatingTranslateModel: z.uuid().optional(),
	floatingExplainModel: z.uuid().optional(),
	inputTranslateModel: z.uuid().optional(),
	inputTranslateLang: z.string().default("en"), // Target language for input translation
});
export type TranslateSettings = z.infer<typeof TranslateSettings>;

export const ServicesSettings = z.object({
	llmServices: z.record(z.uuid(), ModelConfig).default({}),
	traditionalServices: z
		.record(z.uuid(), TraditionalTranslationConfig)
		.default({}),
});
export type ServicesSettings = z.infer<typeof ServicesSettings>;

export const WebsiteRuleSettings = z.object({
	urlPatterns: z.array(z.string()).min(1),
	enableTranslation: z.optional(z.boolean()),
	floatingBallEnabled: z.optional(z.boolean()),
	translateFullPage: z.optional(z.boolean()),
	sourceLang: z.optional(z.string()),
	targetLang: z.optional(z.string()),
	filterInteractive: z.optional(z.boolean()),
	translateMode: z.optional(z.enum(["parallel", "replace"])),
	inTextTranslateModel: z.uuid().optional(),
});
export type WebsiteRuleSettings = z.infer<typeof WebsiteRuleSettings>;
export const WebsiteRulesSettings = z.array(WebsiteRuleSettings);
export type WebsiteRulesSettings = z.infer<typeof WebsiteRulesSettings>;

export const PromptSettings = z.object({
	name: z.string().min(1),
	system: z.string().optional(),
	user: z.string().optional(),
	batch: z.optional(
		z.object({
			delimiter: z.string(),
			trimWhitespace: z.boolean().default(true),
		}),
	),
});
export type PromptSettings = z.infer<typeof PromptSettings>;
export const PromptsSettings = z.record(z.uuid(), PromptSettings);
export type PromptsSettings = z.infer<typeof PromptsSettings>;

export const SettingsSchema = z.object({
	__v: z.number().default(0),
	basic: BasicSettings,
	translate: TranslateSettings,
	services: ServicesSettings,
	websiteRules: WebsiteRulesSettings,
	prompts: PromptsSettings,
});
export type SettingsSchema = z.infer<typeof SettingsSchema>;
