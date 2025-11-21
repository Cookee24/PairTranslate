import Anthropic from "@anthropic-ai/sdk";
import { autoStripMarkdown } from "../json-autocomplete";
import type {
	ChatRequest,
	ClientConfig,
	EndResponse,
	JSONSchema,
	LLMClient,
	Message,
	StreamChunk,
} from "./types";
import { LLMError, LLMErrorType } from "./types";

export function createAnthropicClient(config: ClientConfig): LLMClient {
	const client = new Anthropic({
		apiKey: config.apiKey,
		baseURL: config.baseUrl,
		dangerouslyAllowBrowser: true,
	});

	const convertMessages = (
		messages: Message[],
	): readonly [
		systemMessage: Anthropic.MessageCreateParams["system"],
		messages: { role: "user" | "assistant"; content: string }[],
	] => {
		const systemMessages = messages.filter((msg) => msg.role === "system");
		const systemMessage =
			systemMessages.length > 0
				? systemMessages.map((msg) => msg.content).join("\n\n")
				: undefined;

		const conversationMessages = messages
			.filter((msg) => msg.role !== "system")
			.map((msg) => ({
				role: msg.role as "user" | "assistant",
				content: msg.content,
			}));

		return [systemMessage, conversationMessages];
	};

	const handleError = (error: unknown): LLMError => {
		if (error instanceof Anthropic.APIError) {
			let type = LLMErrorType.API_ERROR;

			if (error.status === 401) {
				type = LLMErrorType.AUTHENTICATION_ERROR;
			} else if (error.status === 429) {
				type = LLMErrorType.RATE_LIMIT_ERROR;
			} else if (error.status === 400) {
				type = LLMErrorType.VALIDATION_ERROR;
			}

			return new LLMError(type, error.message, "anthropic", error);
		}

		if (
			error instanceof Error &&
			(error.message.includes("fetch") || error.message.includes("network"))
		) {
			return new LLMError(
				LLMErrorType.NETWORK_ERROR,
				error.message,
				"anthropic",
				error,
			);
		}

		return new LLMError(
			LLMErrorType.UNKNOWN_ERROR,
			error instanceof Error ? error.message : "Unknown error occurred",
			"anthropic",
			error,
		);
	};

	return {
		async listModels() {
			throw new LLMError(
				LLMErrorType.MODEL_LIST_NOT_SUPPORTED,
				"Anthropic does not support listing models via API. Please manually specify the model name.",
				"anthropic",
			);
		},

		async chat<
			S extends JSONSchema,
			O extends S extends undefined ? string : object,
		>(request: ChatRequest, schema?: S) {
			try {
				const [systemMessage, messages] = convertMessages(request.messages);

				const response = await client.beta.messages.create({
					model: request.model,
					messages,
					system: systemMessage,
					max_tokens: request.maxTokens || 2 ** 16,
					...(schema && {
						betas: ["structured-outputs-2025-11-13"],
						output_format: {
							type: "json_schema",
							schema: schema,
						},
					}),
				});

				const content =
					response.content[0]?.type === "text" ? response.content[0].text : "";
				const output = (schema ? autoStripMarkdown(content) : content) as O;
				const reasoning = response.content
					.filter((block) => block.type === "thinking")
					.map((block) => block.thinking)
					.join();

				return {
					output,
					content,
					reasoning,
					usage: {
						promptTokens: response.usage.input_tokens,
						completionTokens: response.usage.output_tokens,
						totalTokens:
							response.usage.input_tokens + response.usage.output_tokens,
					},
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
				const [systemMessage, messages] = convertMessages(request.messages);

				const responseStream = await client.beta.messages.create({
					model: request.model,
					messages,
					system: systemMessage,
					max_tokens: request.maxTokens || 2 ** 16,
					stream: true,
					...(schema && {
						betas: ["structured-outputs-2025-11-13"],
						output_format: {
							type: "json_schema",
							schema: schema,
						},
					}),
				});

				const usage = {
					promptTokens: 0,
					completionTokens: 0,
					totalTokens: 0,
				};

				for await (const chunk of responseStream) {
					switch (chunk.type) {
						case "content_block_delta":
							if (chunk.delta.type === "text_delta") {
								yield { content: chunk.delta.text };
							}
							if (chunk.delta.type === "thinking_delta") {
								yield { reasoning: chunk.delta.thinking };
							}
							break;
						case "message_start":
							usage.promptTokens = chunk.message.usage.input_tokens;
							break;
						case "message_delta":
							usage.completionTokens = chunk.usage.output_tokens;
							usage.totalTokens = usage.promptTokens + usage.completionTokens;
							break;
						case "message_stop":
							break;
					}
				}

				return {
					usage,
				};
			} catch (error) {
				throw handleError(error);
			}
		},
	};
}
