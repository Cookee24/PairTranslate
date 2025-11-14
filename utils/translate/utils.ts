const deeplLangCodeMap: Record<string, string> = {
	"ZH-CN": "ZH-HANS",
	"ZH-TW": "ZH-HANT",
};
export const transformDeeplLangCode = (langCode: string): string =>
	deeplLangCodeMap[langCode] || langCode;
