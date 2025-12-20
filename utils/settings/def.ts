import z from "zod";
import { getDefaultModifierKey, SELECTION_MODIFIER_KEYS } from "../modifier";

export const SETTINGS_VERSION = 3;

export const FloatingBallPosition = z.object({
	side: z.enum(["left", "right"]).default("right"),
	top: z.number().min(0).max(100).default(20), // Percentage of viewport height
});
export type FloatingBallPosition = z.infer<typeof FloatingBallPosition>;

export const TranslationStyleSettings = z.object({
	bold: z.boolean().default(false),
	italic: z.boolean().default(false),
	underline: z.boolean().default(false),
	background: z.string().optional(),
});
export type TranslationStyleSettings = z.infer<typeof TranslationStyleSettings>;

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
	selectionTranslateModifier: z
		.enum(SELECTION_MODIFIER_KEYS)
		.default(getDefaultModifierKey()),
	inputTranslateEnabled: z.boolean().default(true),
	progressIndicationEnabled: z.boolean().default(true),
	translationStyle: TranslationStyleSettings.default(
		TranslationStyleSettings.parse({}),
	),
});
export type BasicSettings = z.infer<typeof BasicSettings>;

const QueueOverrideShape = z.object({
	requestConcurrency: z.number().min(1).optional(),
	tokensPerMinute: z.number().min(1).optional(),
	maxBatchSize: z.number().min(1).max(100).optional(),
	maxTokensPerBatch: z.number().min(1).max(200000).optional(),
});
export type QueueOverride = z.infer<typeof QueueOverrideShape>;
export const QueueOverrideSettings = QueueOverrideShape.optional();

export const BaseServiceSettings = z.object({
	name: z.string().min(1),
	baseUrl: z.string().url().optional(),
	apiKey: z.string().optional(),
	queue: QueueOverrideSettings,
});

export const LLMServiceSettings = BaseServiceSettings.extend({
	type: z.literal("llm"),
	apiSpec: z.enum(["openai", "anthropic", "google"]),
	model: z.string().optional(),
	temperature: z.number().optional(),
	maxOutputTokens: z.number().optional(),
});

export const TraditionalServiceSettings = BaseServiceSettings.extend({
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

export const QueueControlSettings = z.object({
	requestConcurrency: z.number().min(1).default(4),
	tokensPerMinute: z.number().min(1).default(80000),
	maxBatchSize: z.number().min(1).max(100).default(8),
	maxTokensPerBatch: z.number().min(1).max(200000).default(8000),
	cacheSize: z.number().min(0),
});
export type QueueControlSettings = z.infer<typeof QueueControlSettings>;

export const DebugSettings = z.object({
	verboseLogging: z.boolean().default(false),
	traceLlms: z.boolean().default(false),
	traceTraditional: z.boolean().default(false),
	disableCache: z.boolean().default(false),
	simulateLatencyMs: z.number().min(0).max(3000).default(0),
});
export type DebugSettings = z.infer<typeof DebugSettings>;

export const TranslateSettings = z.object({
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
	translationStyle: TranslationStyleSettings.optional(),
});
export type WebsiteRuleSettings = z.infer<typeof WebsiteRuleSettings>;
export const WebsiteRulesSettings = z.array(WebsiteRuleSettings);
export type WebsiteRulesSettings = z.infer<typeof WebsiteRulesSettings>;

const PromptStep = z.object({
	message: z.string(),
	output: z
		.union([
			z.literal("string"),
			z.object({
				type: z.literal("stringArray"),
				delimiter: z.union([
					z.string(),
					z.object({
						type: z.literal("regex"),
						pattern: z.string(),
						flags: z
							.string()
							.regex(/^[dgimsuvy]*$/, {
								message: "Invalid regex flags. Allowed flags: d g i m s u v y.",
							})
							.optional(),
					}),
				]),
			}),
			z.object({
				type: z.literal("structured"),
				schema: z.any(),
			}),
		])
		.default("string"),
});
export const PromptSettings = z.object({
	name: z.string().min(1),
	systemPrompt: z.string().default(""),
	input: z.enum(["string", "stringArray"]).default("string"),
	output: z.enum(["string", "structured"]).default("string"),
	steps: z.array(PromptStep),
});
export type PromptSettings = z.infer<typeof PromptSettings>;
export const PromptsSettings = z.record(z.uuid(), PromptSettings);
export type PromptsSettings = z.infer<typeof PromptsSettings>;

export const SettingsSchema = z.object({
	__v: z.number().default(SETTINGS_VERSION),
	basic: BasicSettings,
	translate: TranslateSettings,
	services: ServicesSettings,
	queue: QueueControlSettings,
	prompts: PromptsSettings,
	websiteRules: WebsiteRulesSettings,
	debug: DebugSettings,
});
export type SettingsSchema = z.infer<typeof SettingsSchema>;
