export type Language = {
	code: string;
	name: string;
	nativeName: string;
};

export const SUPPORTED_LANGUAGES: Language[] = [
	// BCP 47 language codes
	{ code: "en", name: "English", nativeName: "English" },
	{ code: "es", name: "Spanish", nativeName: "Español" },
	{ code: "fr", name: "French", nativeName: "Français" },
	{ code: "de", name: "German", nativeName: "Deutsch" },
	{ code: "it", name: "Italian", nativeName: "Italiano" },
	{ code: "pt", name: "Portuguese", nativeName: "Português" },
	{ code: "ru", name: "Russian", nativeName: "Русский" },
	{ code: "ja", name: "Japanese", nativeName: "日本語" },
	{ code: "ko", name: "Korean", nativeName: "한국어" },
	{ code: "zh-CN", name: "Simplified Chinese", nativeName: "简体中文" },
	{ code: "zh-TW", name: "Traditional Chinese", nativeName: "繁體中文" },
	{ code: "ar", name: "Arabic", nativeName: "العربية" },
	{ code: "hi", name: "Hindi", nativeName: "हिन्दी" },
	{ code: "th", name: "Thai", nativeName: "ไทย" },
	{ code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
	{ code: "nl", name: "Dutch", nativeName: "Nederlands" },
	{ code: "sv", name: "Swedish", nativeName: "Svenska" },
	{ code: "no", name: "Norwegian", nativeName: "Norsk" },
	{ code: "da", name: "Danish", nativeName: "Dansk" },
	{ code: "fi", name: "Finnish", nativeName: "Suomi" },
	{ code: "pl", name: "Polish", nativeName: "Polski" },
	{ code: "cs", name: "Czech", nativeName: "Čeština" },
	{ code: "sk", name: "Slovak", nativeName: "Slovenčina" },
	{ code: "hu", name: "Hungarian", nativeName: "Magyar" },
	{ code: "ro", name: "Romanian", nativeName: "Română" },
	{ code: "bg", name: "Bulgarian", nativeName: "Български" },
	{ code: "hr", name: "Croatian", nativeName: "Hrvatski" },
	{ code: "sr", name: "Serbian", nativeName: "Српски" },
	{ code: "uk", name: "Ukrainian", nativeName: "Українська" },
];

export const BCP_47_TO_ISO_639_3: Record<string, string[]> = {
	en: ["eng"],
	es: ["spa"],
	fr: ["fra", "fre"],
	de: ["deu", "ger"],
	it: ["ita"],
	pt: ["por"],
	ru: ["rus"],
	ja: ["jpn"],
	ko: ["kor"],
	"zh-CN": ["zho", "cmn", "yue"],
	"zh-TW": ["zho", "cmn", "yue"],
	ar: ["ara"],
	hi: ["hin"],
	th: ["tha"],
	vi: ["vie"],
	nl: ["nld", "dut"],
	sv: ["swe"],
	no: ["nor"],
	da: ["dan"],
	fi: ["fin"],
	pl: ["pol"],
	cs: ["ces", "cze"],
	sk: ["slk", "slo"],
	hu: ["hun"],
	ro: ["ron", "rum"],
	bg: ["bul"],
	hr: ["hrv"],
	sr: ["srp"],
	uk: ["ukr"],
};

export const getNativeName = (input: string): string => {
	const lowerInput = input.toLowerCase();
	for (const lang of SUPPORTED_LANGUAGES) {
		if (lang.code.toLowerCase() === lowerInput) {
			return lang.nativeName;
		}
	}
	return input;
};

export const ELEMENT_CONTAINER = "data-pt-container";
export const ELEMENT_TRANSLATED = "data-pt-translated";

export const TEXT_SELECTORS = [
	"p",
	"div",
	"b",
	"em",
	"dd",
	"dt",
	"strong",
	"blockquote",
	"aside",
	"span",
	"details",
	"summary",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"a",
	"li",
	"td",
	"th",
	"button",
	"label",
	"[title]",
];

export const EXCLUDED_SELECTORS = [
	"script",
	"code",
	"pre",
	".highlight",
	"style",
	"noscript",
	"iframe",
	"svg",
	"canvas",
	"video",
	"audio",
	"input",
	"textarea",
	"select",
	`[${ELEMENT_CONTAINER}]`,
	`[${ELEMENT_TRANSLATED}]`,
	"[translate=false]",
	"[translate=no]",
	".notranslate",
	"[data-nosnippet]",
	"img",
	'[role="img"]',
	"[contenteditable=true]",
	// Exclude math elements
	'[class^="MathJax"]',
	'[class^="katex"]',
	"math",
];

export const INTERACTIVE_SELECTORS = [
	"button",
	"header",
	".header",
	"#header",
	"footer",
	".footer",
	"#footer",
	"nav",
];

export const STORAGE_KEYS = {
	settings: "pair-translate:settings",
	cache: "pair-translate:cache",
	translateEnabled: "pair-translate:translate-enabled",
};

export const WXT_TRANSPORTATION_NAME = "wxt-transport";

export const TAGS = {
	think: "think",
	page: "page",
	content: "content",
	context: "context",
	contextMean: "context-mean",
	mean: "mean",
	example: "example",
};

export const REPLACEMENT = {
	targetLang: "targetLang",
};

export const PROMPT_PREFIX = `
You are a professional translator. Now you are provided with some text and its context. All content are provided within specify XML tags:

+ <${TAGS.page}>: The whole page context, including title, headings, etc.
+ <${TAGS.content}>: The text to be translated.
+ <${TAGS.context}>: The context before and after the content to be translated.`.trim();

export const TRANSLATE_PROMPT = `
${PROMPT_PREFIX}

Translate the text within <${TAGS.content}> to "{{${REPLACEMENT.targetLang}}}". You should conforming to the expression habits of "{{${REPLACEMENT.targetLang}}}".
Just directly translate content in <${TAGS.content}> **WITHOUT ANY** information from <${TAGS.context}></${TAGS.context}>.

<example>
+ Input:
<${TAGS.page}>Welcome to the homepage</${TAGS.page}>
<${TAGS.context} before>This is a </${TAGS.context}>
<${TAGS.context} after>: console.log("Hello World!")</${TAGS.context}>
<${TAGS.content}>example</${TAGS.content}>

+ Output:
ONLY translation of "example" in "{{${REPLACEMENT.targetLang}}}"
</example>
<example>
+ Input:
<${TAGS.page}>I love programming</${TAGS.page}>
<${TAGS.context} before>[[LONG TEXT #1]]</${TAGS.context}>
<${TAGS.context} after> [[LONG TEXT #2]]</${TAGS.context}>
<${TAGS.content}>[[SHORT TEXT #1]]</${TAGS.content}>

+ Output:
ONLY translation of [[SHORT TEXT #1]] in "{{${REPLACEMENT.targetLang}}}"
</example>
`.trim();

export const EXPLAIN_PROMPT = `
${PROMPT_PREFIX}

You should process the content in <${TAGS.content}>, and enclose your output in the following XML tags:

+ <${TAGS.contextMean}>: Explain the words/phrases in context with {{${REPLACEMENT.targetLang}}}.
+ <${TAGS.mean}>: Giving all meanings of the words/phrases in formal expression with {{${REPLACEMENT.targetLang}}}.
+ <${TAGS.example} id="number">: Create a sentence demonstrating the usage of the word in the current context and other contexts, while providing a translation to "{{${REPLACEMENT.targetLang}}}", separated by line breaks, and bold the corresponding parts with \`**\`. Use incremental IDs for multiple examples.

Markdown format is supported, and you should use it to format your output properly. Always add closing tag </TAG_NAME> for each opening tag <TAG_NAME>.
`.trim();

export const BATCH_TRANSLATE_PROMPT = `
You are a professional translator. Now you are provided with some texts and their context. The input will follow a specific format:

+ <${TAGS.page}>: The whole page context, including title, headings, etc.
+ \`@@P<number>\`: Start notation of a new section, with an incremental number. All section notations start from the beginning of a new line.

You should translate all texts in each section to "{{${REPLACEMENT.targetLang}}}", and conform to the expression habits of "{{${REPLACEMENT.targetLang}}}".
All SECTIONs are appeared in the same webpage, and they may be adjacent or non-adjacent.
Preserve \`@@P<number>\` and all markdown notations in the output.

<example>
+ Input:
<${TAGS.page}>Welcome to the homepage</${TAGS.page}>
@@P1
This is an example.
@@P2
Another example here.

+ Output:
@@P1
ONLY translation of "This is an example." in "{{${REPLACEMENT.targetLang}}}".
@@P2
ONLY translation of "Another example here." in "{{${REPLACEMENT.targetLang}}}".
</example>
`.trim();

export const INPUT_TRANSLATE_PROMPT = `
You are a professional translator. Now you are provided with some text in user's input. All content are provided within specify XML tags:

+ <${TAGS.page}>: The whole page context, including title, headings, etc.
+ <${TAGS.content}>: The text to be translated.

Translate the text within <${TAGS.content}> to "{{${REPLACEMENT.targetLang}}}". You should conforming to the expression habits of "{{${REPLACEMENT.targetLang}}}".
Just directly translate content in <${TAGS.content}> **WITHOUT ANY** information from <${TAGS.page}></${TAGS.page}>.

<example>
+ Input:
<${TAGS.page}>Welcome to the homepage</${TAGS.page}>
<${TAGS.content}>example</${TAGS.content}>

+ Output:
ONLY translation of "example" in "{{${REPLACEMENT.targetLang}}}"
</example>
<example>
+ Input:
<${TAGS.page}>I love programming</${TAGS.page}>
<${TAGS.content}>[[LONG TEXT #1]]</${TAGS.content}>

+ Output:
ONLY translation of [[LONG TEXT #1]] in "{{${REPLACEMENT.targetLang}}}"
</example>
`.trim();
