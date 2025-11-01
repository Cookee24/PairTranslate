import type z from "zod";

const id = "a404995f-8bf9-4e3c-86aa-bbc4698bc050"; // Fixed ID for Microsoft Translator

/**
 * Generate default basic settings
 */
export function generateBasicSettings() {
	return BasicSettings.parse({} as z.input<typeof BasicSettings>);
}

/**
 * Generate default translation settings with browser language detection
 */
export function generateTranslateSettings() {
	const targetLang = getTargetLanguage();

	return TranslateSettings.parse({
		targetLang,
		inTextTranslateModel: id,
		floatingTranslateModel: id,
		inputTranslateModel: id,
	} as z.input<typeof TranslateSettings>);
}

export function generateServicesSettings() {
	return ServicesSettings.parse({
		traditionalServices: {
			[id]: {
				name: t("services.microsoftTranslatorDefault"),
				apiSpec: "microsoft",
				apiKey: t("services.edgeApiKey"),
			},
		},
	} as z.input<typeof ServicesSettings>);
}

/**
 * Generate complete default settings
 */
export function generateDefaultSettings() {
	return SettingsSchema.parse({
		basic: generateBasicSettings(),
		translate: generateTranslateSettings(),
		services: generateServicesSettings(),
	} as z.infer<typeof SettingsSchema>);
}

/**
 * Merge existing settings with defaults (deep merge)
 */
export function mergeWithDefaults(
	existingSettings: Partial<z.infer<typeof SettingsSchema>> | null | undefined,
): z.infer<typeof SettingsSchema> {
	const defaults = generateDefaultSettings();

	if (!existingSettings) {
		return defaults;
	}

	return {
		basic: {
			...defaults.basic,
			...existingSettings.basic,
		},
		translate: {
			...defaults.translate,
			...existingSettings.translate,
		},
		services: {
			llmServices:
				existingSettings.services?.llmServices || defaults.services.llmServices,
			traditionalServices:
				existingSettings.services?.traditionalServices ||
				defaults.services.traditionalServices,
		},
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
		name: t("templates.llm.openai"),
		baseUrl: "https://api.openai.com/v1",
		apiSpec: "openai" as const,
	},
	{
		name: t("templates.llm.azureOpenai"),
		baseUrl: "https://{your-resource-name}.openai.azure.com",
		apiSpec: "openai" as const,
	},
	{
		name: t("templates.llm.anthropic"),
		baseUrl: "https://api.anthropic.com",
		apiSpec: "anthropic" as const,
	},
	{
		name: t("templates.llm.googleGemini"),
		baseUrl: "https://generativelanguage.googleapis.com",
		apiSpec: "gemini" as const,
	},
	{
		name: t("templates.llm.lmStudio"),
		baseUrl: "http://localhost:1234/v1",
		apiSpec: "openai" as const,
	},
	{
		name: t("templates.llm.ollama"),
		baseUrl: "http://localhost:11434",
		apiSpec: "openai" as const,
	},
	{
		name: t("templates.llm.openRouter"),
		baseUrl: "https://openrouter.ai/api/v1",
		apiSpec: "openai" as const,
	},
	{
		name: t("templates.llm.cohere"),
		baseUrl: "https://api.cohere.com",
		apiSpec: "openai" as const,
	},
	{
		name: t("templates.llm.huggingFaceInference"),
		baseUrl: "https://api-inference.huggingface.co",
		apiSpec: "openai" as const,
	},
	{
		name: t("templates.llm.ai21Labs"),
		baseUrl: "https://api.ai21.com/studio/v1",
		apiSpec: "openai" as const,
	},
	{
		name: t("templates.llm.mistral"),
		baseUrl: "https://api.mistral.ai",
		apiSpec: "openai" as const,
	},
	{
		name: t("templates.llm.stabilityAI"),
		baseUrl: "https://api.stability.ai",
		apiSpec: "openai" as const,
	},
	{
		name: t("templates.llm.replicate"),
		baseUrl: "https://api.replicate.com",
		apiSpec: "openai" as const,
	},
	{
		name: t("templates.llm.alephAlpha"),
		baseUrl: "https://api.aleph-alpha.com",
		apiSpec: "openai" as const,
	},
	{
		name: t("templates.llm.glm"),
		baseUrl: "https://open.bigmodel.cn/api/paas/v4",
		apiSpec: "openai" as const,
	},
	{
		name: t("templates.llm.deepseek"),
		baseUrl: "https://api.deepseek.com",
		apiSpec: "openai" as const,
	},
	{
		name: t("templates.llm.other"),
		baseUrl: "",
		apiSpec: "openai" as const,
	},
] as z.infer<typeof ModelConfig>[];

export * from "./settings/def";
