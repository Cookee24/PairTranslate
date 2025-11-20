import { t } from "~/utils/i18n";
import {
	createBrowserLanguageDetector,
	createBrowserTranslator,
} from "../browser-translator";
import type {
	TranslationConfig,
	TranslationParams,
	TranslationResult,
} from "./types";

/**
 * Translate using Browser's built-in Translation API
 */
let _detector: Awaited<
	ReturnType<typeof createBrowserLanguageDetector>
> | null = null;
export async function browserTranslate(
	_config: TranslationConfig,
	params: TranslationParams,
): Promise<TranslationResult> {
	try {
		let sourceLang = params.sourceLang;

		// If source language is "auto", detect it
		if (sourceLang === "auto") {
			const detector = _detector
				? _detector
				: await createBrowserLanguageDetector();
			_detector ||= detector;

			const detectionResults = await Promise.all(
				params.text.map((text) => detector.detect(text)),
			);

			// Use the detected language from the first text with highest confidence
			const firstDetection = detectionResults[0]?.[0];
			if (firstDetection) {
				sourceLang = firstDetection.detectedLanguage;
			} else {
				throw new Error(t("errors.additional.browserLanguageDetectionFailed"));
			}
		}

		// Create translator for the language pair
		const translator = await createBrowserTranslator(
			sourceLang,
			params.targetLang,
		);

		// Translate all texts
		const translatedTexts = await Promise.all(
			params.text.map((text) => translator.translate(text)),
		);

		// Clean up translator
		translator.destroy();

		return {
			translatedText: translatedTexts,
		};
	} catch (error) {
		throw {
			type: "API_ERROR",
			message:
				error instanceof Error
					? error.message
					: t("errors.additional.browserApiError"),
			service: "browser" as const,
			details: error,
		};
	}
}
