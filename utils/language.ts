import { franc } from "franc-min";
import { SUPPORTED_LANGUAGES } from "~/utils/constants";

/**
 * Get the browser's UI language
 */
export function getBrowserLanguage(): string {
	return browser.i18n.getUILanguage();
}

/**
 * Normalize language code to match supported formats
 * Converts "en-US" to "en", "zh-CN" to "zh-CN", etc.
 */
export function normalizeLanguageCode(language: string): string {
	// Check for exact match first
	const exactMatch = SUPPORTED_LANGUAGES.find((lang) => lang.code === language);
	if (exactMatch) return language;

	// Extract primary language (e.g., "en" from "en-US")
	const primaryLanguage = language.split("-")[0];
	const primaryMatch = SUPPORTED_LANGUAGES.find(
		(lang) => lang.code === primaryLanguage,
	);
	if (primaryMatch) return primaryLanguage;

	// Fallback to English
	return "en";
}

/**
 * Get the best matching target language based on browser language
 */
export function getTargetLanguage(): string {
	const browserLanguage = getBrowserLanguage();
	return normalizeLanguageCode(browserLanguage);
}

/**
 * Check if a language code is supported
 */
export function isLanguageSupported(language: string): boolean {
	return SUPPORTED_LANGUAGES.some(
		(lang) => lang.code === language || lang.code === language.split("-")[0],
	);
}

/**
 * Get all supported language codes
 */
export function getSupportedLanguageCodes(): string[] {
	return SUPPORTED_LANGUAGES.map((lang) => lang.code);
}

/**
 * Get language name by code
 */
export function getLanguageName(code: string): string | null {
	const language = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
	return language?.name || null;
}

/**
 * Convert BCP 47 language codes to ISO 639-3 codes
 * @param bcp47 BCP 47 language code (e.g., "en", "es", "zh-CN")
 * @returns Corresponding ISO 639-3 codes or null if not found
 */
export function convertBCP_47ToISO639_3(bcp47: string): string[] | null {
	return BCP_47_TO_ISO_639_3[bcp47] || null;
}

export function detectLanguageISO639_3(text: string): string {
	return franc(text);
}
