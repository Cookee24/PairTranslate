export type TranslationService = "google" | "microsoft" | "deepl";

export interface TranslationConfig {
	apiKey: string;
	region?: string; // Required for Microsoft Translator regional resources
	apiUrl?: string; // Optional: Override default API URL
}

export interface TranslationParams {
	text: string[];
	sourceLang: string;
	targetLang: string;
}

export interface TranslationResult {
	translatedText: string[];
}

export interface TranslationError {
	type:
		| "API_ERROR"
		| "AUTHENTICATION_ERROR"
		| "RATE_LIMIT_ERROR"
		| "NETWORK_ERROR";
	message: string;
	service: TranslationService;
	statusCode?: number;
	details?: unknown;
}

export type GoogleTranslateResponse = {
	data: {
		translations: Array<{
			translatedText: string;
			detectedSourceLanguage?: string;
		}>;
	};
};

export type MicrosoftTranslateResponse = Array<{
	translations: Array<{
		text: string;
		to: string;
	}>;
}>;

export type DeepLTranslateResponse = {
	translations: Array<{
		detected_source_language?: string;
		text: string;
	}>;
};
