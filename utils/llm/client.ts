import { createAnthropicClient } from "./anthropic";
import { createGoogleClient } from "./google";
import { createOpenAIClient } from "./openai";
import type { ClientConfig, LLMClient } from "./types";

/**
 * Factory function to create an LLM client for a specific provider.
 *
 * @param provider The LLM provider to create a client for.
 * @param config Configuration object containing the API key and optional base URL.
 * @returns An LLM client instance implementing the LLMClient interface.
 */
export function createLLMClient(
	provider: LLMProvider,
	config: ClientConfig,
): LLMClient {
	switch (provider) {
		case "openai":
			return createOpenAIClient(config);
		case "anthropic":
			return createAnthropicClient(config);
		case "google":
			return createGoogleClient(config);
		default:
			throw new Error(`Unsupported LLM provider: ${provider}`);
	}
}
