import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
	ClientConfig,
	LLMClient,
	UnifiedChatRequest,
	UnifiedChatResponse,
	UnifiedModel,
	UnifiedStreamChunk,
} from "./types";
import { LLMError, LLMErrorType, type LLMProvider } from "./types";

export function createGoogleClient(config: ClientConfig): LLMClient {
	const client = new GoogleGenerativeAI(config.apiKey || "");

	const formatMessages = (
		messages: { role: string; content: string }[],
	): {
		systemInstruction?: string;
		history: Array<{ role: string; parts: { text: string }[] }>;
	} => {
		let systemInstruction: string | undefined;
		const history = messages
			.map((msg) => {
				if (msg.role === "system") {
					systemInstruction = msg.content;
					return null;
				}
				return {
					role: msg.role === "assistant" ? "model" : "user",
					parts: [{ text: msg.content }],
				};
			})
			.filter(
				(item): item is { role: string; parts: { text: string }[] } =>
					item !== null,
			);

		return { systemInstruction, history };
	};

	const handleError = (
		error: unknown,
		defaultType: LLMErrorType,
		provider: LLMProvider = "google",
	): LLMError => {
		let errorType = defaultType;
		let message = "Google Gemini API error";

		if (error && typeof error === "object" && "status" in error) {
			if ("status" in error) {
				switch (error.status) {
					case 400:
						errorType = LLMErrorType.VALIDATION_ERROR;
						message = "Invalid request parameters";
						break;
					case 401:
						errorType = LLMErrorType.AUTHENTICATION_ERROR;
						message = "Invalid API key provided";
						break;
					case 429:
						errorType = LLMErrorType.RATE_LIMIT_ERROR;
						message = "Rate limit exceeded";
						break;
					case 500:
					case 502:
					case 503:
						errorType = LLMErrorType.NETWORK_ERROR;
						message = "Google server error";
						break;
				}
			}

			if ("message" in error && typeof error.message === "string") {
				message = error.message;
			}
		} else if (error instanceof Error) {
			message = error.message;
		}

		return new LLMError(errorType, message, provider, error);
	};

	return {
		async listModels(): Promise<UnifiedModel[]> {
			try {
				// Google Gemini API doesn't have a dynamic model listing endpoint.
				return [];
			} catch (error) {
				throw handleError(error, LLMErrorType.API_ERROR);
			}
		},

		async chat(request: UnifiedChatRequest): Promise<UnifiedChatResponse> {
			try {
				const { systemInstruction, history } = formatMessages(request.messages);
				const model = client.getGenerativeModel({
					model: request.model,
					systemInstruction,
				});

				const chat = model.startChat({ history });
				const lastMessage = history.pop()?.parts[0]?.text as string;

				const result = await chat.sendMessage(lastMessage || "");
				const response = result.response;

				// Count tokens for usage statistics
				const tokenResult = await model.countTokens({
					contents: [
						...history,
						{ role: "user", parts: [{ text: lastMessage || "" }] },
					],
				});
				const completionTokenResult = await model.countTokens({
					contents: [{ role: "model", parts: [{ text: response.text() }] }],
				});

				return {
					content: response.text(),
					usage: {
						promptTokens: tokenResult.totalTokens,
						completionTokens: completionTokenResult.totalTokens,
						totalTokens:
							tokenResult.totalTokens + completionTokenResult.totalTokens,
					},
					providerResponse: response,
				};
			} catch (error) {
				throw handleError(error, LLMErrorType.API_ERROR);
			}
		},

		async *chatStream(
			request: UnifiedChatRequest,
		): AsyncIterable<UnifiedStreamChunk> {
			try {
				const { systemInstruction, history } = formatMessages(request.messages);
				const model = client.getGenerativeModel({
					model: request.model,
					systemInstruction,
				});

				const chat = model.startChat({ history });
				const lastMessage = history.pop()?.parts[0]?.text as string;

				const result = await chat.sendMessageStream(lastMessage || "");

				for await (const chunk of result.stream) {
					const text = chunk.text();
					if (text) {
						yield { content: text };
					}
				}
			} catch (error) {
				throw handleError(error, LLMErrorType.API_ERROR);
			}
		},
	};
}
