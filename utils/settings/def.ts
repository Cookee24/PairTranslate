import z from "zod";

export const SETTINGS_VERSION = 1;

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

const BaseServiceSettings = z.object({
	name: z.string().min(1),
	baseUrl: z.string().url().optional(),
	apiKey: z.string().optional(),
});

const LLMServiceSettings = BaseServiceSettings.extend({
	type: z.literal("llm"),
	apiSpec: z.enum(["openai", "anthropic", "google"]),
	model: z.string().optional(),
	temperature: z.number().optional(),
	maxOutputTokens: z.number().optional(),
});

const TraditionalServiceSettings = BaseServiceSettings.extend({
	type: z.literal("traditional"),
	apiSpec: z.enum(["microsoft", "google", "deepl", "deeplx", "browser"]),
	region: z.string().optional(),
});

export const ServiceSettings = z.union([
	LLMServiceSettings,
	TraditionalServiceSettings,
]);
export type ServiceSettings = z.infer<typeof ServiceSettings>;

export const ModelSettings = ServiceSettings;
export type ModelSettings = ServiceSettings;

export const ServicesSettings = z.record(z.uuid(), ModelSettings).default({});
export type ServicesSettings = z.infer<typeof ServicesSettings>;

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

export const WebsiteRuleSettings = z.object({
	urlPatterns: z.array(z.string()),
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
	input: z.enum(["string", "stringArray"]).default("string"),
	output: z.enum(["string", "structured"]).default("string"),
	// Accessor to get specific field from structured output
	// Default to `step[N]`, where N is the last step index
	outputAccessor: z.string().optional(),
	// Optional schemas for structured output
	steps: z.array(
		// Define multi steps prompt. Every single step is added into the conversation history.
		// Outputted content of previous steps can be referenced by {{step[N]}} or {{tool[N][T]}}
		// where N is the step index starting from 0, T is the tool call index that llm responded with
		z.object({
			message: z.array(
				z.object({
					role: z.enum(["system", "user", "assistant"]),
					// Optional text content for the step
					content: z.string().optional(),
				}),
			),
			output: z
				.union([
					z.literal("string"),
					z.object({
						type: z.literal("stringArray"),
						// Regexp
						delimiter: z.string().default("\n"),
					}),
					z.object({
						type: z.literal("structured"),
						schema: z.any(),
					}),
				])
				.default("string"),
		}),
	),
});
export type PromptSettings = z.infer<typeof PromptSettings>;
export const PromptsSettings = z.record(z.uuid(), PromptSettings);
export type PromptsSettings = z.infer<typeof PromptsSettings>;

export const SettingsSchema = z.object({
	__v: z.number().default(SETTINGS_VERSION),
	basic: BasicSettings,
	translate: TranslateSettings,
	services: ServicesSettings,
	websiteRules: WebsiteRulesSettings,
	prompts: PromptsSettings,
});
export type SettingsSchema = z.infer<typeof SettingsSchema>;
