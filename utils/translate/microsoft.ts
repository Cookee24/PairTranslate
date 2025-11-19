import type {
	TranslationConfig,
	TranslationError,
	TranslationParams,
	TranslationResult,
} from "./types";

let cachedApiKey: string | null = null;
let lastTimestamp = 0;

export const microsoftTranslate = async (
	config: TranslationConfig,
	params: TranslationParams,
): Promise<TranslationResult> => {
	const apiUrl =
		config.baseUrl || "https://api.cognitive.microsofttranslator.com/translate";
	const urlParams = new URLSearchParams({
		"api-version": "3.0",
		to: params.targetLang,
	});

	if (params.sourceLang && params.sourceLang !== "auto") {
		urlParams.append("from", params.sourceLang);
	}

	const url = `${apiUrl}?${urlParams.toString()}`;

	const headers: Record<string, string> = {
		"Content-Type": "application/json; charset=UTF-8",
	};

	let apiKey = config.apiKey;
	if (config.apiKey === "edge") {
		const INTERVAL = 9 * 60 * 1000;
		const now = Date.now();
		if (now - lastTimestamp > INTERVAL) {
			cachedApiKey = null;
		}
		if (cachedApiKey) {
			apiKey = cachedApiKey;
		} else {
			try {
				const result = await fetch("https://edge.microsoft.com/translate/auth");
				if (!result.ok) {
					throw new Error("Failed to fetch API key from Edge");
				}
				apiKey = await result.text();
				cachedApiKey = apiKey;
				lastTimestamp = Date.now();
			} catch (error) {
				console.error(error);
				apiKey = "";
			}
		}
		headers.Authorization = `Bearer ${apiKey}`;
	} else if (apiKey) {
		headers["Ocp-Apim-Subscription-Key"] = apiKey;
	}

	if (config.region) {
		headers["Ocp-Apim-Subscription-Region"] = config.region;
	}

	try {
		const response = await fetch(url, {
			method: "POST",
			headers,
			body: JSON.stringify(params.text.map((text) => ({ Text: text }))),
		});

		if (!response.ok) {
			const errorData = await response.text();
			let errorMessage = `Microsoft Translator API error: ${response.statusText}`;

			try {
				const parsedError = JSON.parse(errorData);
				if (parsedError.error?.message) {
					errorMessage = parsedError.error.message;
				}
			} catch {
				// Use the original error message if JSON parsing fails
			}

			const error: TranslationError = {
				type:
					response.status === 401
						? "AUTHENTICATION_ERROR"
						: response.status === 429
							? "RATE_LIMIT_ERROR"
							: "API_ERROR",
				message: errorMessage,
				service: "microsoft",
				statusCode: response.status,
				details: errorData,
			};
			throw error;
		}

		const data = await response.json();

		if (!Array.isArray(data)) {
			throw new Error("Invalid response format from Microsoft Translator API");
		}

		const translatedText = data.map(
			// biome-ignore lint/suspicious/noExplicitAny: API response
			(item: any) => item.translations?.[0]?.text || "",
		);
		return { translatedText };
	} catch (error) {
		if (error instanceof Error && error.message.includes("Failed to fetch")) {
			const networkError: TranslationError = {
				type: "NETWORK_ERROR",
				message: "Network error: Failed to connect to Microsoft Translator API",
				service: "microsoft",
			};
			throw networkError;
		}
		throw error;
	}
};
