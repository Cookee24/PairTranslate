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

export const DATA_STYLE = "data-pt-style";
export const DATA_IFRAME = "data-pt-iframe";
export const DATA_CONTAINER = "data-pt-container";
export const DATA_TRANSLATED = "data-pt-translated";
export const DATA_GRABBING_CONTAINER = "data-pt-grabbing-container";
export const DATA_PREVENT_SCROLL = "data-pt-prevent-scroll";

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
	"option",
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
	"svg",
	"canvas",
	"video",
	"audio",
	"input",
	"textarea",
	`[${DATA_CONTAINER}]`,
	`[${DATA_TRANSLATED}]`,
	"[translate=false]",
	"[translate=no]",
	".notranslate",
	"[data-nosnippet]",
	"img",
	'[role="img"]',
	"[contenteditable=true]",
	".monaco-editor",
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
	domainTimer: "pair-translate:domain-timer",
	domainTimers: "pair-translate:domain-timers",
	settingsMigrationError: "pair-translate:settings-migration-error",
};

export const DOMAIN_TIMER_UNTIL_CLOSE = "UNTIL_CLOSE" as const;

export type DomainTimersMap = Record<
	string,
	number | typeof DOMAIN_TIMER_UNTIL_CLOSE
>;

export const WXT_TRANSPORTATION_NAME = "wxt-transport";

export const MS_TRANSLATOR_ID = "a404995f-8bf9-4e3c-86aa-bbc4698bc050"; // Fixed ID for Microsoft Translator
export const PROMPT_ID = {
	translate: "8e6da19e-808e-4696-810c-e1c1fe2cd1fd",
	batchTranslate: "99337c6e-3cc2-4b57-a8ce-aed530ecd97f",
	explain: "c39b8ab4-5656-4887-8b48-d5eb86fa0b8f",
	inputTranslate: "4a87e959-cab4-4b8d-bc8f-1079dc2c4c86",
	dictionaryTranslate: "d736a0f9-6f61-4f34-9d54-2c7ec49c70d7",
};
