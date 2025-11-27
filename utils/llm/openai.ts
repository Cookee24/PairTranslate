import OpenAI from "openai";
import { autoStripMarkdown } from "../json-autocomplete";
import type {
	ChatRequest,
	ClientConfig,
	EndResponse,
	LLMClient,
	StreamChunk,
} from "./types";
import { LLMError, LLMErrorType } from "./types";

const extractReasoning = (content: object | undefined): string | undefined => {
	if (!content) return undefined;
	const KEYS = ["reasoning", "reasoning_content", "think"];
	for (const key of KEYS) {
		if (
			key in content &&
			typeof content[key as keyof typeof content] === "string"
		) {
			return content[key as keyof typeof content] as string;
		}
	}
};

export function createOpenAIClient(config: ClientConfig): LLMClient {
	const client = new OpenAI({
		apiKey: config.apiKey,
		baseURL: config.baseUrl,
		dangerouslyAllowBrowser: true,
	});

	const handleError = (error: unknown): LLMError => {
		if (error instanceof OpenAI.APIError) {
			let type = LLMErrorType.API_ERROR;

			if (error.status === 401) {
				type = LLMErrorType.AUTHENTICATION_ERROR;
			} else if (error.status === 429) {
				type = LLMErrorType.RATE_LIMIT_ERROR;
			} else if (error.status === 400) {
				type = LLMErrorType.VALIDATION_ERROR;
			}

			return new LLMError(type, error.message, "openai", error);
		}

		if (
			error instanceof Error &&
			(error.message.includes("fetch") || error.message.includes("network"))
		) {
			return new LLMError(
				LLMErrorType.NETWORK_ERROR,
				error.message,
				"openai",
				error,
			);
		}

		return new LLMError(
			LLMErrorType.UNKNOWN_ERROR,
			error instanceof Error ? error.message : "Unknown error occurred",
			"openai",
			error,
		);
	};

	return {
		async listModels() {
			try {
				const response = await client.models.list();
				return response.data.map((model) => ({
					id: model.id,
					provider: "openai" as const,
					displayName: model.id,
				}));
			} catch (error) {
				throw handleError(error);
			}
		},

		async chat<S, O extends S extends undefined ? string : object>(
			request: ChatRequest,
			schema?: S,
		) {
			try {
				const messages = request.messages;

				const response = await client.chat.completions.create({
					model: request.model,
					messages,
					temperature: request.temperature,
					max_tokens: request.maxTokens,
					top_p: request.topP,
					...(schema && {
						response_format: {
							type: "json_schema",
							json_schema: {
								name: "response",
								schema: schema,
							},
						},
					}),
				});

				const message = response.choices[0]?.message;
				const content = message?.content || "";
				const output = (schema ? autoStripMarkdown(content) : content) as O;
				const reasoning = extractReasoning(message);

				return {
					output,
					content,
					reasoning,
					...(response.usage && {
						usage: {
							promptTokens: response.usage.prompt_tokens,
							completionTokens: response.usage.completion_tokens,
							totalTokens: response.usage.total_tokens,
						},
					}),
					providerResponse: response,
				};
			} catch (error) {
				throw handleError(error);
			}
		},

		async *chatStream<S>(
			request: ChatRequest,
			schema?: S,
		): AsyncGenerator<StreamChunk, EndResponse> {
			try {
				const messages = request.messages;

				const stream = await client.chat.completions.create({
					model: request.model,
					messages,
					temperature: request.temperature,
					max_tokens: request.maxTokens,
					top_p: request.topP,
					stream: true,
					stream_options: { include_usage: true },
					...(schema && {
						response_format: {
							type: "json_schema",
							json_schema: {
								name: "response",
								schema: schema,
							},
						},
					}),
				});

				for await (const chunk of stream) {
					const delta = chunk.choices[0]?.delta;
					const content = delta?.content;
					const reasoning = extractReasoning(delta);

					if (content) {
						yield { content };
					}
					if (reasoning) {
						yield { reasoning };
					}
					if (chunk.usage) {
						return {
							usage: {
								promptTokens: chunk.usage.prompt_tokens,
								completionTokens: chunk.usage.completion_tokens,
								totalTokens: chunk.usage.total_tokens,
							},
						};
					}
				}

				return {};
			} catch (error) {
				throw handleError(error);
			}
		},
	};
}
