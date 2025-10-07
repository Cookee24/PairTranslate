import type {
	TranslationConfig,
	TranslationError,
	TranslationParams,
	TranslationResult,
} from "./types";

export const googleTranslate = async (
	config: TranslationConfig,
	params: TranslationParams,
): Promise<TranslationResult> => {
	const apiUrl =
		config.apiUrl || "https://translation.googleapis.com/language/translate/v2";

	try {
		const response = await fetch(`${apiUrl}?key=${config.apiKey}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json; charset=utf-8",
			},
			body: JSON.stringify({
				q: params.text,
				source: params.sourceLang === "auto" ? undefined : params.sourceLang,
				target: params.targetLang,
			}),
		});

		if (!response.ok) {
			const errorData = await response.text();
			let errorMessage = `Google Translate API error: ${response.statusText}`;

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
				service: "google",
				statusCode: response.status,
				details: errorData,
			};
			throw error;
		}

		const data = await response.json();

		if (!data.data?.translations?.[0]?.translatedText) {
			throw new Error("Invalid response format from Google Translate API");
		}

		const translatedText = data.data.translations[0].translatedText;
		return { translatedText };
	} catch (error) {
		if (error instanceof Error && error.message.includes("Failed to fetch")) {
			const networkError: TranslationError = {
				type: "NETWORK_ERROR",
				message: "Network error: Failed to connect to Google Translate API",
				service: "google",
			};
			throw networkError;
		}
		throw error;
	}
};
