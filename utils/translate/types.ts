import type { ServiceSettings } from "../settings";

export type TranslationService = Extract<
	ServiceSettings,
	{ type: "traditional" }
>["apiSpec"];

export type TranslationConfig = Extract<
	ServiceSettings,
	{ type: "traditional" }
> & {
	name?: string;
};

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

export type DeepLXTranslateResponse = {
	code: number;
	data: string;
	source_lang?: string;
	target_lang: string;
	alternatives?: string[];
	id?: number;
	method?: string;
};
