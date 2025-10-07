import OpenAI from "openai";
import type {
	ClientConfig,
	LLMClient,
	UnifiedChatRequest,
	UnifiedChatResponse,
	UnifiedModel,
	UnifiedStreamChunk,
} from "./types";
import { LLMError, LLMErrorType, type LLMProvider } from "./types";

export function createOpenAIClient(config: ClientConfig): LLMClient {
	const client = new OpenAI({
		apiKey: config.apiKey,
		baseURL: config.baseUrl,
		dangerouslyAllowBrowser: true,
	});

	const handleError = (
		error: unknown,
		defaultType: LLMErrorType,
		provider: LLMProvider = "openai",
	): LLMError => {
		let errorType = defaultType;
		let message = t("errors.openai.apiError");

		if (error instanceof OpenAI.APIError) {
			switch (error.status) {
				case 401:
					errorType = LLMErrorType.AUTHENTICATION_ERROR;
					message = t("errors.openai.invalidApiKey");
					break;
				case 429:
					errorType = LLMErrorType.RATE_LIMIT_ERROR;
					message = t("errors.openai.rateLimitExceeded");
					break;
				case 500:
				case 502:
				case 503:
					errorType = LLMErrorType.NETWORK_ERROR;
					message = t("errors.openai.serverError");
					break;
				default:
					message = error.message || t("errors.openai.apiError");
			}
		} else if (error instanceof Error) {
			message = error.message;
		}

		return new LLMError(errorType, message, provider, error);
	};

	return {
		async listModels(): Promise<UnifiedModel[]> {
			try {
				const models = await client.models.list();
				return models.data.map((model) => ({
					id: model.id,
					provider: "openai",
					displayName: model.id,
				}));
			} catch (error) {
				throw handleError(error, LLMErrorType.API_ERROR);
			}
		},

		async chat(request: UnifiedChatRequest): Promise<UnifiedChatResponse> {
			try {
				const response = await client.chat.completions.create({
					model: request.model,
					messages: request.messages,
					temperature: request.temperature,
					max_tokens: request.maxTokens,
					top_p: request.topP,
					stream: false,
				});

				return {
					content: response.choices[0]?.message?.content ?? "",
					usage: {
						promptTokens: response.usage?.prompt_tokens ?? 0,
						completionTokens: response.usage?.completion_tokens ?? 0,
						totalTokens: response.usage?.total_tokens ?? 0,
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
				const stream = await client.chat.completions.create({
					model: request.model,
					messages: request.messages,
					temperature: request.temperature,
					max_tokens: request.maxTokens,
					top_p: request.topP,
					stream: true,
				});

				for await (const chunk of stream) {
					const content = chunk.choices[0]?.delta?.content;
					if (content) {
						yield { content };
					}
				}
			} catch (error) {
				throw handleError(error, LLMErrorType.API_ERROR);
			}
		},
	};
}
