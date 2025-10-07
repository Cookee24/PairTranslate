import type {
	TranslationConfig,
	TranslationError,
	TranslationParams,
	TranslationResult,
} from "./types";

export const deepLTranslate = async (
	config: TranslationConfig,
	params: TranslationParams,
): Promise<TranslationResult> => {
	const apiUrl = config.apiUrl || "https://api-free.deepl.com/v2/translate";

	const body = new URLSearchParams();
	body.append("text", params.text);
	body.append("target_lang", params.targetLang.toUpperCase());

	if (params.sourceLang && params.sourceLang !== "auto") {
		body.append("source_lang", params.sourceLang.toUpperCase());
	}

	try {
		const response = await fetch(apiUrl, {
			method: "POST",
			headers: {
				Authorization: `DeepL-Auth-Key ${config.apiKey}`,
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: body.toString(),
		});

		if (!response.ok) {
			const errorData = await response.text();
			let errorMessage = `DeepL API error: ${response.statusText}`;

			try {
				const parsedError = JSON.parse(errorData);
				if (parsedError.message) {
					errorMessage = parsedError.message;
				} else if (parsedError.error?.message) {
					errorMessage = parsedError.error.message;
				}
			} catch {
				// Use the original error message if JSON parsing fails
			}

			const error: TranslationError = {
				type:
					response.status === 403
						? "AUTHENTICATION_ERROR"
						: response.status === 429
							? "RATE_LIMIT_ERROR"
							: "API_ERROR",
				message: errorMessage,
				service: "deepl",
				statusCode: response.status,
				details: errorData,
			};
			throw error;
		}

		const data = await response.json();

		if (!data.translations?.[0]?.text) {
			throw new Error("Invalid response format from DeepL API");
		}

		const translatedText = data.translations[0].text;
		return { translatedText };
	} catch (error) {
		if (error instanceof Error && error.message.includes("Failed to fetch")) {
			const networkError: TranslationError = {
				type: "NETWORK_ERROR",
				message: "Network error: Failed to connect to DeepL API",
				service: "deepl",
			};
			throw networkError;
		}
		throw error;
	}
};
