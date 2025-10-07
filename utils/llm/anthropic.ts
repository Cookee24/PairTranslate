import Anthropic from "@anthropic-ai/sdk";
import type {
	ClientConfig,
	LLMClient,
	UnifiedChatRequest,
	UnifiedChatResponse,
	UnifiedModel,
	UnifiedStreamChunk,
} from "./types";
import { LLMError, LLMErrorType, type LLMProvider } from "./types";

export function createAnthropicClient(config: ClientConfig): LLMClient {
	const client = new Anthropic({
		apiKey: config.apiKey,
		baseURL: config.baseUrl,
		dangerouslyAllowBrowser: true,
	});

	const separateSystemPrompt = (
		messages: { role: string; content: string }[],
	): { systemPrompt?: string; messages: Anthropic.MessageParam[] } => {
		let systemPrompt: string | undefined;
		const filteredMessages = messages.filter((msg) => {
			if (msg.role === "system") {
				systemPrompt = msg.content;
				return false;
			}
			return true;
		});

		return {
			systemPrompt,
			messages: filteredMessages as Anthropic.MessageParam[],
		};
	};

	const handleError = (
		error: unknown,
		defaultType: LLMErrorType,
		provider: LLMProvider = "anthropic",
	): LLMError => {
		let errorType = defaultType;
		let message = t("errors.anthropic.apiError");

		if (error instanceof Anthropic.APIError) {
			switch (error.status) {
				case 401:
					errorType = LLMErrorType.AUTHENTICATION_ERROR;
					message = t("errors.anthropic.invalidApiKey");
					break;
				case 429:
					errorType = LLMErrorType.RATE_LIMIT_ERROR;
					message = t("errors.anthropic.rateLimitExceeded");
					break;
				case 500:
				case 502:
				case 503:
					errorType = LLMErrorType.NETWORK_ERROR;
					message = t("errors.anthropic.serverError");
					break;
				default:
					message = error.message || t("errors.anthropic.apiError");
			}
		} else if (error instanceof Error) {
			message = error.message;
		}

		return new LLMError(errorType, message, provider, error);
	};

	return {
		async listModels(): Promise<UnifiedModel[]> {
			try {
				// Anthropic does not provide a public API for listing models.
				return [];
			} catch (error) {
				throw handleError(error, LLMErrorType.API_ERROR);
			}
		},

		async chat(request: UnifiedChatRequest): Promise<UnifiedChatResponse> {
			try {
				const { systemPrompt, messages } = separateSystemPrompt(
					request.messages,
				);

				const response = await client.messages.create({
					model: request.model,
					system: systemPrompt,
					messages: messages,
					max_tokens: request.maxTokens ?? 1024,
					temperature: request.temperature,
					top_p: request.topP,
					top_k: request.topK,
				});

				return {
					content: response.content
						.filter(
							(block): block is { type: "text"; text: string } =>
								block.type === "text",
						)
						.map((block) => block.text)
						.join(""),
					usage: {
						promptTokens: response.usage.input_tokens,
						completionTokens: response.usage.output_tokens,
						totalTokens:
							response.usage.input_tokens + response.usage.output_tokens,
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
				const { systemPrompt, messages } = separateSystemPrompt(
					request.messages,
				);

				const stream = client.messages.stream({
					model: request.model,
					system: systemPrompt,
					messages: messages,
					max_tokens: request.maxTokens ?? 1024,
					temperature: request.temperature,
					top_p: request.topP,
					top_k: request.topK,
				});

				for await (const event of stream) {
					if (
						event.type === "content_block_delta" &&
						event.delta.type === "text_delta"
					) {
						yield { content: event.delta.text };
					}
				}
			} catch (error) {
				throw handleError(error, LLMErrorType.API_ERROR);
			}
		},
	};
}
