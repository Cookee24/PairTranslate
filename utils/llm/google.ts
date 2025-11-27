import { type Content, GoogleGenAI, type Part } from "@google/genai";
import { autoStripMarkdown } from "../json-autocomplete";
import type {
	ChatRequest,
	ClientConfig,
	EndResponse,
	LLMClient,
	Message,
	StreamChunk,
} from "./types";
import { LLMError, LLMErrorType } from "./types";

export function createGoogleClient(config: ClientConfig): LLMClient {
	if (!config.apiKey) {
		throw new LLMError(
			LLMErrorType.VALIDATION_ERROR,
			"API key is required for Google Gemini",
			"google",
		);
	}

	const client = new GoogleGenAI({
		apiKey: config.apiKey,
		httpOptions: {
			baseUrl: config.baseUrl,
		},
	});

	const convertMessages = (
		messages: Message[],
	): readonly [systemInstruction: string | undefined, contents: Content[]] => {
		const systemMessages = messages.filter((msg) => msg.role === "system");
		const systemInstruction =
			systemMessages.length > 0
				? systemMessages.map((msg) => msg.content).join("\n\n")
				: undefined;

		const conversationMessages = messages.filter(
			(msg) => msg.role !== "system",
		);

		const contents: Content[] = conversationMessages.map((msg) => {
			const role = msg.role === "assistant" ? "model" : "user";
			const parts: Part[] = [{ text: msg.content }];

			return {
				role,
				parts,
			};
		});

		return [systemInstruction, contents];
	};

	const handleError = (error: unknown): LLMError => {
		if (error instanceof Error) {
			let type = LLMErrorType.API_ERROR;
			const message = error.message;

			// Check for common Google API error patterns
			if (message.includes("API key") || message.includes("401")) {
				type = LLMErrorType.AUTHENTICATION_ERROR;
			} else if (message.includes("quota") || message.includes("429")) {
				type = LLMErrorType.RATE_LIMIT_ERROR;
			} else if (message.includes("400") || message.includes("invalid")) {
				type = LLMErrorType.VALIDATION_ERROR;
			} else if (message.includes("fetch") || message.includes("network")) {
				type = LLMErrorType.NETWORK_ERROR;
			}

			return new LLMError(type, message, "google", error);
		}

		return new LLMError(
			LLMErrorType.UNKNOWN_ERROR,
			"Unknown error occurred",
			"google",
			error,
		);
	};

	return {
		async listModels() {
			throw new LLMError(
				LLMErrorType.MODEL_LIST_NOT_SUPPORTED,
				"Google Gemini does not support listing models via API. Please manually specify the model name.",
				"google",
			);
		},

		async chat<S, O extends S extends undefined ? string : object>(
			request: ChatRequest,
			schema?: S,
			signal?: AbortSignal,
		) {
			try {
				const [systemInstruction, contents] = convertMessages(request.messages);

				const response = await client.models.generateContent({
					model: request.model,
					contents,
					config: {
						systemInstruction,
						temperature: request.temperature,
						maxOutputTokens: request.maxTokens,
						topP: request.topP,
						topK: request.topK,
						thinkingConfig: {
							includeThoughts: true,
						},
						abortSignal: signal,
						...(schema && {
							responseMimeType: "application/json",
							// biome-ignore lint/suspicious/noExplicitAny: Bypass type check for SDK compatibility
							responseSchema: schema as any,
						}),
					},
				});

				const content = response.text || "";
				const output = (schema ? autoStripMarkdown(content) : content) as O;
				const reasoning = response.candidates?.[0]?.content?.parts
					?.filter((part) => part.thought)
					.map((part) => part.text)
					.join();

				return {
					output,
					content,
					reasoning,
					...(response.usageMetadata && {
						usage: {
							promptTokens: response.usageMetadata.promptTokenCount || 0,
							completionTokens:
								response.usageMetadata.candidatesTokenCount || 0,
							totalTokens: response.usageMetadata.totalTokenCount || 0,
						},
					}),
					providerResponse: response,
				};
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") {
					throw error;
				}
				throw handleError(error);
			}
		},

		async *chatStream<S>(
			request: ChatRequest,
			schema?: S,
			signal?: AbortSignal,
		): AsyncGenerator<StreamChunk, EndResponse> {
			try {
				const [systemInstruction, contents] = convertMessages(request.messages);
				const stream = await client.models.generateContentStream({
					model: request.model,
					config: {
						systemInstruction,
						temperature: request.temperature,
						maxOutputTokens: request.maxTokens,
						topP: request.topP,
						topK: request.topK,
						thinkingConfig: {
							includeThoughts: true,
						},
						abortSignal: signal,
						...(schema && {
							responseMimeType: "application/json",
							// biome-ignore lint/suspicious/noExplicitAny: Bypass type check for SDK compatibility
							responseSchema: schema as any,
						}),
					},
					contents,
				});

				let usage = {
					promptTokens: 0,
					completionTokens: 0,
					totalTokens: 0,
				};

				for await (const chunk of stream) {
					const content = chunk.text;
					const reasoning = chunk.candidates?.[0]?.content?.parts
						?.filter((part) => part.thought)
						.map((part) => part.text)
						.join();
					if (content) {
						yield { content };
					}
					if (reasoning) {
						yield { reasoning };
					}

					// Update usage from each chunk
					if (chunk.usageMetadata) {
						usage = {
							promptTokens: chunk.usageMetadata.promptTokenCount || 0,
							completionTokens: chunk.usageMetadata.candidatesTokenCount || 0,
							totalTokens: chunk.usageMetadata.totalTokenCount || 0,
						};
					}
				}

				return {
					usage,
				};
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") {
					throw error;
				}
				throw handleError(error);
			}
		},
	};
}
