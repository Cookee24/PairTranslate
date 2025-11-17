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

export const STYLE_CONTAINER = "data-pt-style";
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

export const MS_TRANSLATOR_ID = "a404995f-8bf9-4e3c-86aa-bbc4698bc050"; // Fixed ID for Microsoft Translator
export const PROMPT_ID = {
	translate: "f7c3d8a1-2b4e-4f9a-8c1d-5e6f7a8b9c0d",
	batchTranslate: "a1b2c3d4-e5f6-47a8-9b0c-1d2e3f4a5b6c",
	explain: "9e8f7d6c-5b4a-3291-8a7f-6e5d4c3b2a19",
	inputTranslate: "c0d1e2f3-4a5b-6c7d-8e9f-0a1b2c3d4e5f",
};
