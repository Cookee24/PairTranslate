export type MessageRole = "user" | "assistant" | "system";

export interface Message {
	role: MessageRole;
	content: string;
}

/**
 * Optional parameters to control the model's output.
 */
export interface ChatParams {
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	topK?: number;
}

/**
 * The complete request object for a chat completion.
 */
export interface ChatRequest extends ChatParams {
	model: string;
	messages: Message[];
	schema?: object;
	stream?: boolean;
}

export interface EndResponse {
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	/** The original, raw response from the provider for debugging or provider-specific data. */
	providerResponse?: unknown;
}

/**
 * The response object for a standard (non-streaming) chat request.
 */
export interface ChatResponse<O = string> extends EndResponse {
	output: O;
}

/**
 * A single chunk of data from a streaming chat response.
 */
export interface StreamChunk {
	content: string;
}

/**
 * Represents a model available from a provider.
 */
export interface Model {
	id: string;
	provider: LLMProvider;
	displayName?: string;
}

/**
 * Enumeration of the supported LLM providers.
 */
export type LLMProvider = "openai" | "anthropic" | "google";

export type JSONSchema = {
	[key: string]: unknown;
};

/**
 * The core interface that every provider-specific client must implement.
 */
export interface LLMClient {
	listModels(): Promise<Model[]>;
	chat<S extends JSONSchema, O extends S extends undefined ? string : object>(
		request: ChatRequest,
		schema?: S,
	): Promise<ChatResponse<O>>;
	chatStream<S extends JSONSchema>(
		request: ChatRequest,
		schema?: S,
	): AsyncGenerator<StreamChunk, EndResponse>;
}

/**
 * Configuration for creating an LLM client.
 */
export interface ClientConfig {
	apiKey?: string;
	baseUrl: string;
}

/**
 * Error types for LLM operations.
 */
export enum LLMErrorType {
	API_ERROR = "api_error",
	NETWORK_ERROR = "network_error",
	AUTHENTICATION_ERROR = "authentication_error",
	RATE_LIMIT_ERROR = "rate_limit_error",
	VALIDATION_ERROR = "validation_error",
	MODEL_LIST_NOT_SUPPORTED = "model_list_not_supported",
	UNKNOWN_ERROR = "unknown_error",
}

/**
 * Custom error class for LLM operations.
 */
export class LLMError extends Error {
	public readonly type: LLMErrorType;
	public readonly provider?: LLMProvider;
	public readonly originalError?: unknown;

	constructor(
		type: LLMErrorType,
		message: string,
		provider?: LLMProvider,
		originalError?: unknown,
	) {
		super(message);
		this.name = "LLMError";
		this.type = type;
		this.provider = provider;
		this.originalError = originalError;
	}
}
