import type * as s from "./def";

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
		inputTranslateEnabled: true,
		progressIndicationEnabled: true,
	};
}

/**
 * Generate default translation settings with browser language detection
 */
export function generateTranslateSettings(): s.TranslateSettings {
	const targetLang = getTargetLanguage();

	return {
		concurrentRequests: 8,
		cacheSize: 4096,
		maxBatchSize: 4,
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
	return {
		llmServices: {},
		traditionalServices: {
			[MS_TRANSLATOR_ID]: {
				name: t("services.microsoftTranslatorDefault"),
				apiSpec: "microsoft",
				apiKey: "edge",
			},
			...(supportBrowserTranslator && {
				"5b02ae2c-9a84-491c-830d-53a99227e03d": {
					name: t("settings.browserTranslator.serviceName"),
					apiSpec: "browser",
				},
			}),
		},
	};
}

export function generateWebsiteRuleSettings(): s.WebsiteRulesSettings {
	return [];
}

const TRANSLATE_PROMPT =
	`You are a professional translator. Now you are provided with some text and its context. All content are provided within specify XML tags:

+ <page>: The whole page context, including title, headings, etc.
+ <content>: The text to be translated.
+ <context>: The context before and after the content to be translated.

Translate the text within <content> to "{{targetLang}}". You should conforming to the expression habits of "{{targetLang}}".
Just directly translate content in <content> **WITHOUT ANY** information from <context></context>.

<example>
+ Input:
<page>Welcome to the homepage</page>
<context before>This is a </context>
<context after>: console.log("Hello World!")</context>
<content>example</content>

+ Output:
ONLY translation of "example" in "{{targetLang}}"
</example>
<example>
+ Input:
<page>I love programming</page>
<context before>[[LONG TEXT #1]]</context>
<context after> [[LONG TEXT #2]]</context>
<content>[[SHORT TEXT #1]]</content>

+ Output:
ONLY translation of [[SHORT TEXT #1]] in "{{targetLang}}"
</example>`.trim();

const TRANSLATE_PROMPT_USER = `<page>{{page}}</page>
<context before>{{contextBefore}}</context>
<context after>{{contextAfter}}</context>
<content>{{content}}</content>`.trim();

const BATCH_TRANSLATE_PROMPT =
	`You are a professional translator. Now you are provided with some texts and their context. The input will follow a specific format:

+ <page>: The whole page context, including title, headings, etc.
+ \`@@P<number>\`: Start notation of a new section, with an incremental number. All section notations start from the beginning of a new line.

You should translate all texts in each section to "{{targetLang}}", and conform to the expression habits of "{{targetLang}}".
Each parts of texts separated by \`@@P<number>\` are in the same context from <page>. They can be adjacent or separated.
Preserve \`@@P<number>\` and all markdown notations in the output. Just directly translate the text in each section **WITHOUT ANY** information from <page></page>.

<example>
+ Input:
<page>Welcome to the homepage</page>
@@P1
This is an example.
@@P2
Another example here.

+ Output:
@@P1
ONLY translation of "This is an example." in "{{targetLang}}".
@@P2
ONLY translation of "Another example here." in "{{targetLang}}".
</example>`.trim();
const BATCH_TRANSLATE_PROMPT_USER = `<page>{{page}}</page>
{{#for}}
@@P{{index}}
{{content}}
{{/for}}
`.trim();

const EXPLAIN_PROMPT =
	`You are a professional translator. Now you are provided with some text and its context. All content are provided within specify XML tags:

+ <page>: The whole page context, including title, headings, etc.
+ <content>: The text to be translated.
+ <context>: The context before and after the content to be translated.

You should process the content in <content>, and enclose your output in the following XML tags:

+ <context-mean>: Explain the words/phrases in context with {{targetLang}}.
+ <mean>: Giving all meanings of the words/phrases in formal expression with {{targetLang}}.
+ <example id="number">: Create a sentence demonstrating the usage of the word in the current context and other contexts, while providing a translation to "{{targetLang}}", separated by line breaks, and bold the corresponding parts with \`**\`. Use incremental IDs for multiple examples.

Markdown format is supported, and you should use it to format your output properly. Always add closing tag </TAG_NAME> for each opening tag <TAG_NAME>.`.trim();
const EXPLAIN_PROMPT_USER = `<page>{{page}}</page>
<context before>{{contextBefore}}</context>
<context after>{{contextAfter}}</context>
<content>{{content}}</content>`.trim();

const INPUT_TRANSLATE_PROMPT =
	`You are a professional translator. Now you are provided with some text in user's input. All content are provided within specify XML tags:

+ <page>: The whole page context, including title, headings, etc.
+ <content>: The text to be translated.

Translate the text within <content> to "{{targetLang}}". You should conforming to the expression habits of "{{targetLang}}".
Just directly translate content in <content> **WITHOUT ANY** information from <page></page>.

<example>
+ Input:
<page>Welcome to the homepage</page>
<content>example</content>

+ Output:
ONLY translation of "example" in "{{targetLang}}"
</example>
<example>
+ Input:
<page>I love programming</page>
<content>[[LONG TEXT #1]]</content>

+ Output:
ONLY translation of [[LONG TEXT #1]] in "{{targetLang}}"
</example>`.trim();
const INPUT_TRANSLATE_PROMPT_USER = `<page>{{page}}</page>
<content>{{content}}</content>`.trim();

export function generatePromptSettings(): s.PromptsSettings {
	return {
		[PROMPT_ID.translate]: {
			name: "翻译",
			system: TRANSLATE_PROMPT,
			user: TRANSLATE_PROMPT_USER,
		},
		[PROMPT_ID.batchTranslate]: {
			name: "批量翻译",
			system: BATCH_TRANSLATE_PROMPT,
			user: BATCH_TRANSLATE_PROMPT_USER,
			batch: {
				delimiter: "@@P{{index}}",
				trimWhitespace: true,
			},
		},
		[PROMPT_ID.explain]: {
			name: "解释",
			system: EXPLAIN_PROMPT,
			user: EXPLAIN_PROMPT_USER,
		},
		[PROMPT_ID.inputTranslate]: {
			name: "输入翻译",
			system: INPUT_TRANSLATE_PROMPT,
			user: INPUT_TRANSLATE_PROMPT_USER,
		},
	};
}

/**
 * Generate complete default settings
 */
export function generateDefaultSettings(): s.SettingsSchema {
	return {
		__v: 1,
		basic: generateBasicSettings(),
		translate: generateTranslateSettings(),
		services: generateServicesSettings(),
		websiteRules: generateWebsiteRuleSettings(),
		prompts: generatePromptSettings(),
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
] as s.ModelConfig[];
