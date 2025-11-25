import { createAnthropicClient } from "./llm/anthropic";
import { createGoogleClient } from "./llm/google";
import { createOpenAIClient } from "./llm/openai";
import type { ClientConfig, LLMProvider } from "./llm/types";
import { LLMError, LLMErrorType } from "./llm/types";

export function createLLMClient(
	provider: "anthropic",
	config: ClientConfig,
): ReturnType<typeof createAnthropicClient>;
export function createLLMClient(
	provider: "openai",
	config: ClientConfig,
): ReturnType<typeof createOpenAIClient>;
export function createLLMClient(
	provider: "google",
	config: ClientConfig,
): ReturnType<typeof createGoogleClient>;
export function createLLMClient(
	provider: LLMProvider,
	config: ClientConfig,
): import("./llm/types").LLMClient;
export function createLLMClient(
	provider: LLMProvider,
	config: ClientConfig,
): import("./llm/types").LLMClient {
	switch (provider) {
		case "openai": {
			return createOpenAIClient(config);
		}
		case "anthropic": {
			return createAnthropicClient(config);
		}
		case "google": {
			return createGoogleClient(config);
		}
		default:
			throw new LLMError(
				LLMErrorType.VALIDATION_ERROR,
				`Unsupported provider: ${provider}`,
			);
	}
}

export * from "./llm/types";
