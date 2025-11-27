import type {
	TranslationConfig,
	TranslationError,
	TranslationParams,
	TranslationResult,
} from "./types";
import { transformDeeplLangCode } from "./utils";

export const deeplxTranslate = async (
	config: TranslationConfig,
	params: TranslationParams,
): Promise<TranslationResult> => {
	const apiUrl = config.baseUrl || "https://deeplx.owo.network/translate";

	let sourceLang: string | undefined = params.sourceLang.toUpperCase();
	if (sourceLang === "AUTO") {
		sourceLang = undefined;
	}
	const targetLang = transformDeeplLangCode(params.targetLang.toUpperCase());
	const ensureNotAborted = () => {
		if (params.signal?.aborted) {
			throw new DOMException("Aborted", "AbortError");
		}
	};

	try {
		// DeepLX translates one text at a time, so we need to handle batch translations
		const translatedText: string[] = [];

		for (const text of params.text) {
			ensureNotAborted();
			const requestBody: Record<string, unknown> = {
				text: text,
				source_lang: sourceLang,
				target_lang: targetLang,
			};

			const response = await fetch(apiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
				},
				signal: params.signal,
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				const errorData = await response.text();
				let errorMessage = `DeepLX API error: ${response.statusText}`;

				try {
					const parsedError = JSON.parse(errorData);
					if (parsedError.message) {
						errorMessage = parsedError.message;
					}
				} catch {
					// Use the original error message if JSON parsing fails
				}

				const error: TranslationError = {
					type:
						response.status === 401 || response.status === 403
							? "AUTHENTICATION_ERROR"
							: response.status === 429
								? "RATE_LIMIT_ERROR"
								: "API_ERROR",
					message: errorMessage,
					service: "deeplx",
					statusCode: response.status,
					details: errorData,
				};
				throw error;
			}

			const data = await response.json();

			if (data.code !== 200) {
				const error: TranslationError = {
					type: "API_ERROR",
					message: `DeepLX API returned error code: ${data.code}`,
					service: "deeplx",
					details: data,
				};
				throw error;
			}

			translatedText.push(data.data);
		}

		return { translatedText };
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			throw error;
		}
		if (error instanceof Error && error.message.includes("Failed to fetch")) {
			const networkError: TranslationError = {
				type: "NETWORK_ERROR",
				message: "Network error: Failed to connect to DeepLX API",
				service: "deeplx",
			};
			throw networkError;
		}
		throw error;
	}
};
