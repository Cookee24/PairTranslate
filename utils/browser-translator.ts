/**
 * Browser Translator API utilities
 * Based on the Web Translation and Language Detector APIs
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Translator_and_Language_Detector_APIs
 */

export type TranslatorAvailability =
	| "available"
	| "downloadable"
	| "downloading"
	| "unavailable";

export interface DownloadProgressEvent {
	loaded: number;
}

export interface CreateMonitor {
	addEventListener: (
		event: "downloadprogress",
		handler: (e: DownloadProgressEvent) => void,
	) => void;
}

export interface TranslatorCreateOptions {
	sourceLanguage: string;
	targetLanguage: string;
	signal?: AbortSignal;
	monitor?: (monitor: CreateMonitor) => void;
}

export interface LanguageDetectorCreateOptions {
	expectedInputLanguages?: string[];
	signal?: AbortSignal;
	monitor?: (monitor: CreateMonitor) => void;
}

export interface TranslatorCheckResult {
	isSupported: boolean;
	availability?: TranslatorAvailability;
	error?: string;
}

export interface LanguageDetectorCheckResult {
	isSupported: boolean;
	availability?: TranslatorAvailability;
	error?: string;
}

export interface TranslatorCapabilities {
	translator: TranslatorCheckResult;
	languageDetector: LanguageDetectorCheckResult;
}

/**
 * Check if the browser supports the Translator API
 */
export async function checkTranslatorSupport(
	sourceLanguage = "en",
	targetLanguage = "zh",
): Promise<TranslatorCheckResult> {
	try {
		// @ts-expect-error - Translator API is experimental
		if (typeof globalThis.Translator === "undefined") {
			return {
				isSupported: false,
				error: t("errors.additional.browserTranslatorUnavailable"),
			};
		}

		// @ts-expect-error - Translator API is experimental
		const availability = await globalThis.Translator.availability({
			sourceLanguage,
			targetLanguage,
		});

		return {
			isSupported: true,
			availability: availability as TranslatorAvailability,
		};
	} catch (error) {
		return {
			isSupported: false,
			error:
				error instanceof Error
					? error.message
					: t("errors.additional.unknownError"),
		};
	}
}

/**
 * Check if the browser supports the Language Detector API
 */
export async function checkLanguageDetectorSupport(
	expectedInputLanguages: string[] = ["en", "zh", "ja", "es", "fr"],
): Promise<LanguageDetectorCheckResult> {
	try {
		// @ts-expect-error - LanguageDetector API is experimental
		if (typeof globalThis.LanguageDetector === "undefined") {
			return {
				isSupported: false,
				error: t("errors.additional.browserLanguageDetectorUnavailable"),
			};
		}

		// @ts-expect-error - LanguageDetector API is experimental
		const availability = await globalThis.LanguageDetector.availability({
			expectedInputLanguages,
		});

		return {
			isSupported: true,
			availability: availability as TranslatorAvailability,
		};
	} catch (error) {
		return {
			isSupported: false,
			error:
				error instanceof Error
					? error.message
					: t("errors.additional.unknownError"),
		};
	}
}

/**
 * Check all browser translation capabilities
 */
export async function checkBrowserTranslationCapabilities(
	languagePairs: Array<{ source: string; target: string }> = [
		{ source: "en", target: "zh" },
		{ source: "zh", target: "en" },
		{ source: "en", target: "ja" },
		{ source: "ja", target: "en" },
	],
): Promise<{
	translator: Map<string, TranslatorCheckResult>;
	languageDetector: LanguageDetectorCheckResult;
}> {
	const translatorResults = new Map<string, TranslatorCheckResult>();

	// Check each language pair
	for (const pair of languagePairs) {
		const key = `${pair.source}-${pair.target}`;
		const result = await checkTranslatorSupport(pair.source, pair.target);
		translatorResults.set(key, result);
	}

	// Check language detector with all languages
	const allLanguages = [
		...new Set(languagePairs.flatMap((p) => [p.source, p.target])),
	];
	const languageDetectorResult =
		await checkLanguageDetectorSupport(allLanguages);

	return {
		translator: translatorResults,
		languageDetector: languageDetectorResult,
	};
}

/**
 * Create a translator instance
 */
export async function createBrowserTranslator(
	sourceLanguage: string,
	targetLanguage: string,
	options?: {
		signal?: AbortSignal;
		onDownloadProgress?: (progress: number) => void;
	},
) {
	// @ts-expect-error - Translator API is experimental
	if (typeof globalThis.Translator === "undefined") {
		throw new Error(t("errors.additional.browserTranslatorUnavailable"));
	}

	const createOptions: TranslatorCreateOptions = {
		sourceLanguage,
		targetLanguage,
	};

	if (options?.signal) {
		createOptions.signal = options.signal;
	}

	if (options?.onDownloadProgress) {
		createOptions.monitor = (monitor: CreateMonitor) => {
			monitor.addEventListener(
				"downloadprogress",
				(e: DownloadProgressEvent) => {
					options.onDownloadProgress?.(e.loaded);
				},
			);
		};
	}

	// @ts-expect-error - Translator API is experimental
	const translator = await globalThis.Translator.create(createOptions);

	return {
		translate: async (text: string): Promise<string> => {
			return await translator.translate(text);
		},
		destroy: () => {
			translator.destroy();
		},
	};
}

/**
 * Create a language detector instance
 */
export async function createBrowserLanguageDetector(
	expectedInputLanguages?: string[],
	options?: {
		signal?: AbortSignal;
		onDownloadProgress?: (progress: number) => void;
	},
) {
	// @ts-expect-error - LanguageDetector API is experimental
	if (typeof globalThis.LanguageDetector === "undefined") {
		throw new Error(t("errors.additional.browserLanguageDetectorUnavailable"));
	}

	const createOptions: LanguageDetectorCreateOptions = {};

	if (expectedInputLanguages) {
		createOptions.expectedInputLanguages = expectedInputLanguages;
	}

	if (options?.signal) {
		createOptions.signal = options.signal;
	}

	if (options?.onDownloadProgress) {
		createOptions.monitor = (monitor: CreateMonitor) => {
			monitor.addEventListener(
				"downloadprogress",
				(e: DownloadProgressEvent) => {
					options.onDownloadProgress?.(e.loaded);
				},
			);
		};
	}

	// @ts-expect-error - LanguageDetector API is experimental
	const detector = await globalThis.LanguageDetector.create(createOptions);

	return {
		detect: async (
			text: string,
		): Promise<Array<{ detectedLanguage: string; confidence: number }>> => {
			return await detector.detect(text);
		},
		destroy: () => {
			detector.destroy();
		},
	};
}
