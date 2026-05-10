import { ThinkingLevel } from "@google/genai";

export const THINKING_BUDGET_LEVELS = [
	"off",
	"low",
	"medium",
	"high",
	"xhigh",
] as const;

export type ThinkingBudget = (typeof THINKING_BUDGET_LEVELS)[number];

type OpenAIReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh";
type OpenAIThinkingType = "enabled" | "disabled";

const THINKING_BUDGET_RATIOS: Record<Exclude<ThinkingBudget, "off">, number> = {
	low: 0.2,
	medium: 0.5,
	high: 0.8,
	xhigh: 0.95,
};

const ANTHROPIC_MIN_BUDGET_TOKENS = 1024;
const GEMINI_25_PRO_MIN_BUDGET = 128;
const GEMINI_25_PRO_MAX_BUDGET = 32768;
const GEMINI_FLASH_MAX_BUDGET = 24576;
const GEMINI_FLASH_LITE_MIN_BUDGET = 512;

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

const calculateBudgetByRatio = (
	thinkingBudget: ThinkingBudget,
	maxTokens: number,
	minBudget: number,
	maxBudget: number,
): number | undefined => {
	if (thinkingBudget === "off") {
		return undefined;
	}

	const ratio = THINKING_BUDGET_RATIOS[thinkingBudget];
	const upperBound = Math.min(Math.max(maxTokens - 1, 0), maxBudget);
	if (upperBound < minBudget) {
		return undefined;
	}

	return clamp(Math.floor(maxTokens * ratio), minBudget, upperBound);
};

export const mapOpenAIReasoningEffort = (
	thinkingBudget: ThinkingBudget,
): OpenAIReasoningEffort =>
	thinkingBudget === "off" ? "none" : thinkingBudget;

export const getOpenAIReasoningConfig = (thinkingBudget?: ThinkingBudget) => {
	if (!thinkingBudget) {
		return {};
	}

	const effort = mapOpenAIReasoningEffort(thinkingBudget);
	const type: OpenAIThinkingType =
		thinkingBudget === "off" ? "disabled" : "enabled";

	return {
		reasoningEffort: effort,
		extraBody: {
			reasoning: {
				effort,
			},
			thinking: {
				type,
			},
		},
	};
};

export const getAnthropicThinkingConfig = (
	thinkingBudget: ThinkingBudget | undefined,
	maxTokens: number,
) => {
	if (!thinkingBudget || thinkingBudget === "off") {
		return undefined;
	}

	const budgetTokens = calculateBudgetByRatio(
		thinkingBudget,
		maxTokens,
		ANTHROPIC_MIN_BUDGET_TOKENS,
		maxTokens - 1,
	);
	if (!budgetTokens) {
		return undefined;
	}

	return {
		type: "enabled" as const,
		budget_tokens: budgetTokens,
	};
};

const normalizeModelName = (model: string) => model.trim().toLowerCase();

export const isGemini3Model = (model: string) =>
	normalizeModelName(model).includes("gemini-3");

const isGemini25Model = (model: string) =>
	normalizeModelName(model).includes("gemini-2.5");

const isGeminiFlashModel = (model: string) =>
	normalizeModelName(model).includes("flash");

const isGeminiLiteModel = (model: string) =>
	normalizeModelName(model).includes("lite");

const isRoboticsModel = (model: string) =>
	normalizeModelName(model).includes("robotics-er");

export const getGeminiThinkingLevel = (
	model: string,
	thinkingBudget: ThinkingBudget,
): ThinkingLevel => {
	if (isGeminiFlashModel(model)) {
		switch (thinkingBudget) {
			case "off":
				return ThinkingLevel.MINIMAL;
			case "low":
				return ThinkingLevel.LOW;
			case "medium":
				return ThinkingLevel.MEDIUM;
			case "high":
			case "xhigh":
				return ThinkingLevel.HIGH;
		}
	}

	switch (thinkingBudget) {
		case "off":
		case "low":
			return ThinkingLevel.LOW;
		case "medium":
		case "high":
		case "xhigh":
			return ThinkingLevel.HIGH;
	}
};

const resolveGeminiBudgetRange = (model: string) => {
	if (isGemini25Model(model) && normalizeModelName(model).includes("pro")) {
		return {
			min: GEMINI_25_PRO_MIN_BUDGET,
			max: GEMINI_25_PRO_MAX_BUDGET,
			canDisable: false,
		};
	}

	if (isGeminiLiteModel(model)) {
		return {
			min: GEMINI_FLASH_LITE_MIN_BUDGET,
			max: GEMINI_FLASH_MAX_BUDGET,
			canDisable: true,
		};
	}

	if (
		isGemini25Model(model) ||
		isGeminiFlashModel(model) ||
		isRoboticsModel(model)
	) {
		return {
			min: 0,
			max: GEMINI_FLASH_MAX_BUDGET,
			canDisable: true,
		};
	}

	return {
		min: 0,
		max: GEMINI_FLASH_MAX_BUDGET,
		canDisable: true,
	};
};

const getGeminiThinkingBudget = (
	model: string,
	thinkingBudget: ThinkingBudget,
	maxTokens?: number,
) => {
	const range = resolveGeminiBudgetRange(model);

	if (thinkingBudget === "off") {
		return range.canDisable ? 0 : range.min;
	}

	const boundedMaxTokens = maxTokens
		? Math.min(maxTokens, range.max)
		: range.max;
	return calculateBudgetByRatio(
		thinkingBudget,
		boundedMaxTokens,
		Math.max(range.min, 1),
		range.max,
	);
};

export const getGoogleThinkingConfig = (
	model: string,
	thinkingBudget?: ThinkingBudget,
	maxTokens?: number,
) => {
	const baseConfig = {
		includeThoughts: true,
	};

	if (!thinkingBudget) {
		return baseConfig;
	}

	if (isGemini3Model(model)) {
		return {
			...baseConfig,
			thinkingLevel: getGeminiThinkingLevel(model, thinkingBudget),
		};
	}

	const thinkingTokenBudget = getGeminiThinkingBudget(
		model,
		thinkingBudget,
		maxTokens,
	);
	if (thinkingTokenBudget === undefined) {
		return baseConfig;
	}

	return {
		...baseConfig,
		thinkingBudget: thinkingTokenBudget,
	};
};
