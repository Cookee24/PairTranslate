import {
	isStringArrayOutput,
	resolveStringArrayDelimiter,
	splitWithDelimiter,
} from "~/utils/prompt/delimiter";
import {
	type Message,
	templateToTokens,
	tokensToString,
} from "~/utils/prompt/parser";
import type { PromptSettings } from "~/utils/settings";

export type TranslatePayload = string | string[];

export type CompiledStep = {
	messageTokens: ReturnType<typeof templateToTokens>;
	output: PromptSettings["steps"][number]["output"];
	stringArrayDelimiter?: string | RegExp;
};

export type CompiledPrompt = {
	input: PromptSettings["input"];
	systemTokens: ReturnType<typeof templateToTokens>;
	steps: CompiledStep[];
};

export const compilePrompt = (prompt: PromptSettings): CompiledPrompt => ({
	input: prompt.input,
	systemTokens: templateToTokens(prompt.systemPrompt),
	steps: prompt.steps.map((step) => ({
		output: step.output,
		messageTokens: templateToTokens(step.message),
		stringArrayDelimiter: isStringArrayOutput(step.output)
			? resolveStringArrayDelimiter(step.output)
			: undefined,
	})),
});

export const normalizePromptInput = (
	prompt: CompiledPrompt,
	text: TranslatePayload,
): TranslatePayload => {
	if (prompt.input === "stringArray") {
		if (Array.isArray(text)) return text;
		return text ? [text] : [];
	}
	if (Array.isArray(text)) {
		return text.join("\n\n");
	}
	return text;
};

export const toTextArray = (text: TranslatePayload): string[] =>
	Array.isArray(text) ? text : text ? [text] : [];

export const initializeConversation = (
	prompt: CompiledPrompt,
	ctx: Parameters<typeof tokensToString>[0],
): Message[] => {
	const systemContent = tokensToString(ctx, prompt.systemTokens);
	return systemContent ? [{ role: "system", content: systemContent }] : [];
};

export const snapshotConversation = (messages: Message[]): Message[] =>
	messages.map((message) => ({ ...message }));

export const normalizeLLMStepOutput = (
	step: CompiledStep,
	output: unknown,
): unknown => {
	if (typeof output !== "string") {
		return output;
	}
	if (!step.stringArrayDelimiter) {
		return output;
	}
	return splitWithDelimiter(output, step.stringArrayDelimiter);
};

export const normalizeStreamAggregate = (
	step: CompiledStep | undefined,
	value: string,
): string | string[] => {
	if (!step?.stringArrayDelimiter) {
		return value;
	}
	return splitWithDelimiter(value, step.stringArrayDelimiter);
};

export type PromptPreviewStep = {
	index: number;
	label: string;
	message: string;
};

export const buildStepPreview = (
	prompt: CompiledPrompt,
	ctx: Parameters<typeof tokensToString>[0],
): { system?: string; steps: PromptPreviewStep[] } => {
	const steps: PromptPreviewStep[] = [];
	const outputs: unknown[] = [];
	ctx.output = outputs as unknown[];
	const system = tokensToString(ctx, prompt.systemTokens);

	prompt.steps.forEach((step, index) => {
		const message = tokensToString(ctx, step.messageTokens);
		steps.push({
			index,
			label: `Step ${index + 1}`,
			message,
		});
		outputs.push(`{{output:${index + 1}}}`);
	});

	return { system: system || undefined, steps };
};
