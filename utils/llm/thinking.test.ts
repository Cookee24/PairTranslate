import { expect, test } from "bun:test";
import { ThinkingLevel } from "@google/genai";
import { SettingsSchema } from "~/utils/settings/def";
import {
	getAnthropicThinkingConfig,
	getGoogleThinkingConfig,
	getOpenAIReasoningConfig,
	isGemini3Model,
} from "./thinking";

test("settings schema accepts missing and configured thinkingBudget", () => {
	const withoutThinkingBudget = SettingsSchema.safeParse({
		__v: 3,
		basic: {
			enabled: true,
			theme: "system",
			selectionPopupEnabled: true,
			autoPin: false,
			floatingBallEnabled: true,
			floatingBallPosition: {
				side: "right",
				top: 20,
			},
			keyboardShortcutEnabled: true,
			keyboardShortcut: "Alt+T",
			selectionTranslateEnabled: true,
			selectionTranslateModifier: "Alt",
			inputTranslateEnabled: true,
			progressIndicationEnabled: true,
			translationStyle: {},
		},
		translate: {
			sourceLang: "auto",
			targetLang: "en",
			filterInteractive: true,
			translationMode: "parallel",
			inTextTranslateIconEnabled: true,
			translateFullPage: false,
			inputTranslateLang: "en",
		},
		services: {
			"11111111-1111-4111-8111-111111111111": {
				type: "llm",
				name: "OpenAI",
				apiSpec: "openai",
				baseUrl: "https://api.openai.com/v1",
				model: "gpt-5",
			},
		},
		queue: {
			requestConcurrency: 4,
			tokensPerMinute: 80000,
			maxBatchSize: 8,
			maxTokensPerBatch: 8000,
			cacheSize: 1000,
		},
		prompts: {},
		websiteRules: [],
		debug: {
			verboseLogging: false,
			traceLlms: false,
			traceTraditional: false,
			disableCache: false,
			simulateLatencyMs: 0,
		},
	});
	expect(withoutThinkingBudget.success).toBe(true);

	const withThinkingBudget = SettingsSchema.safeParse({
		...withoutThinkingBudget.data,
		services: {
			"11111111-1111-4111-8111-111111111111": {
				type: "llm",
				name: "OpenAI",
				apiSpec: "openai",
				baseUrl: "https://api.openai.com/v1",
				model: "gpt-5",
				thinkingBudget: "xhigh",
			},
		},
	});
	expect(withThinkingBudget.success).toBe(true);
});

test("openai reasoning config includes all combined fields", () => {
	expect(getOpenAIReasoningConfig("off")).toEqual({
		reasoningEffort: "none",
		extraBody: {
			reasoning: {
				effort: "none",
			},
			thinking: {
				type: "disabled",
			},
		},
	});

	expect(getOpenAIReasoningConfig("high")).toEqual({
		reasoningEffort: "high",
		extraBody: {
			reasoning: {
				effort: "high",
			},
			thinking: {
				type: "enabled",
			},
		},
	});
});

test("anthropic thinking config clamps budget and omits off", () => {
	expect(getAnthropicThinkingConfig(undefined, 4096)).toBeUndefined();
	expect(getAnthropicThinkingConfig("off", 4096)).toBeUndefined();
	expect(getAnthropicThinkingConfig("low", 4096)).toEqual({
		type: "enabled",
		budget_tokens: 1024,
	});
	expect(getAnthropicThinkingConfig("xhigh", 2048)).toEqual({
		type: "enabled",
		budget_tokens: 1945,
	});
});

test("gemini 3 models use thinkingLevel", () => {
	expect(isGemini3Model("gemini-3-pro")).toBe(true);
	expect(getGoogleThinkingConfig("gemini-3-pro", "low", 4096)).toEqual({
		includeThoughts: true,
		thinkingLevel: ThinkingLevel.LOW,
	});
	expect(getGoogleThinkingConfig("gemini-3-flash", "medium", 4096)).toEqual({
		includeThoughts: true,
		thinkingLevel: ThinkingLevel.MEDIUM,
	});
});

test("gemini 2.5 models use thinkingBudget", () => {
	expect(getGoogleThinkingConfig("gemini-2.5-pro", "off", 4096)).toEqual({
		includeThoughts: true,
		thinkingBudget: 128,
	});
	expect(getGoogleThinkingConfig("gemini-2.5-flash", "high", 12000)).toEqual({
		includeThoughts: true,
		thinkingBudget: 9600,
	});
});
