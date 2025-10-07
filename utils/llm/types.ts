/**
 * Defines the role of the message author.
 * 'system': Provides high-level instructions for the conversation.
 * 'user': Represents a message from the end-user.
 * 'assistant': Represents a message from the model.
 */
export type UnifiedMessageRole = "user" | "assistant" | "system";

/**
 * A single message in a chat conversation.
 */
export interface UnifiedMessage {
	role: UnifiedMessageRole;
	content: string;
}

/**
 * Optional parameters to control the model's output.
 */
export interface UnifiedChatParams {
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	topK?: number;
}

/**
 * The complete request object for a chat completion.
 */
export interface UnifiedChatRequest extends UnifiedChatParams {
	model: string;
	messages: UnifiedMessage[];
	stream?: boolean;
}

/**
 * The response object for a standard (non-streaming) chat request.
 */
export interface UnifiedChatResponse {
	content: string;
	usage: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	/** The original, raw response from the provider for debugging or provider-specific data. */
	providerResponse: unknown;
}

/**
 * A single chunk of data from a streaming chat response.
 */
export interface UnifiedStreamChunk {
	content: string;
}

/**
 * Represents a model available from a provider.
 */
export interface UnifiedModel {
	id: string;
	provider: LLMProvider;
	displayName?: string;
}

/**
 * Enumeration of the supported LLM providers.
 */
export type LLMProvider = "openai" | "anthropic" | "google";

/**
 * The core interface that every provider-specific client must implement.
 */
export interface LLMClient {
	listModels(): Promise<UnifiedModel[]>;
	chat(request: UnifiedChatRequest): Promise<UnifiedChatResponse>;
	chatStream(request: UnifiedChatRequest): AsyncIterable<UnifiedStreamChunk>;
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
