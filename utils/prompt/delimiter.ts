import { createTranslateError, TranslateErrorType } from "~/utils/errors";
import type { PromptSettings } from "~/utils/settings";

export type PromptStepOutput = PromptSettings["steps"][number]["output"];
export type StringArrayStepOutput = Extract<
	PromptStepOutput,
	{ type: "stringArray" }
>;
export type RegexDelimiterConfig = Extract<
	StringArrayStepOutput["delimiter"],
	{ type: "regex" }
>;

const DEFAULT_REGEX_FLAGS = "gm";

const isRegexDelimiterConfig = (
	delimiter: StringArrayStepOutput["delimiter"],
): delimiter is RegexDelimiterConfig =>
	Boolean(
		delimiter &&
			typeof delimiter === "object" &&
			"type" in delimiter &&
			delimiter.type === "regex" &&
			typeof delimiter.pattern === "string",
	);

export const isStringArrayOutput = (
	output: PromptStepOutput,
): output is StringArrayStepOutput =>
	typeof output === "object" &&
	output !== null &&
	"type" in output &&
	output.type === "stringArray";

export const resolveStringArrayDelimiter = (
	output: StringArrayStepOutput,
): string | RegExp => {
	const rawDelimiter = output.delimiter ?? "\n";
	if (!isRegexDelimiterConfig(rawDelimiter)) {
		return rawDelimiter;
	}
	const flags = rawDelimiter.flags?.trim()
		? rawDelimiter.flags
		: DEFAULT_REGEX_FLAGS;
	try {
		return new RegExp(rawDelimiter.pattern, flags);
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw createTranslateError(
			TranslateErrorType.INVALID_PROMPT,
			`Invalid regex delimiter: ${reason}`,
		);
	}
};

export const splitWithDelimiter = (
	value: string,
	delimiter: string | RegExp,
): string[] =>
	value
		.split(delimiter)
		.map((entry) => entry.trim())
		.filter(Boolean);
