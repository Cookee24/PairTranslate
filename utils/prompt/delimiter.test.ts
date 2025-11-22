import { describe, expect, test } from "bun:test";

import {
	resolveStringArrayDelimiter,
	type StringArrayStepOutput,
	splitWithDelimiter,
} from "./delimiter";

const createStringArrayOutput = (
	delimiter: StringArrayStepOutput["delimiter"],
): StringArrayStepOutput => ({
	type: "stringArray",
	delimiter,
});

describe("resolveStringArrayDelimiter", () => {
	test("returns literal delimiters as-is", () => {
		const output = createStringArrayOutput("<end>");
		const delimiter = resolveStringArrayDelimiter(output);
		expect(delimiter).toBe("<end>");
	});

	test("compiles regex delimiters with default flags", () => {
		const output = createStringArrayOutput({
			type: "regex",
			pattern: "^## Paragraph \\d+$",
		});
		const delimiter = resolveStringArrayDelimiter(output);
		expect(delimiter).toBeInstanceOf(RegExp);
		const sample = "## Paragraph 1\nFirst\n## Paragraph 2\nSecond";
		const result = splitWithDelimiter(sample, delimiter);
		expect(result).toEqual(["First", "Second"]);
	});

	test("throws helpful error for invalid regex", () => {
		const output = createStringArrayOutput({
			type: "regex",
			pattern: "(",
		});
		expect(() => resolveStringArrayDelimiter(output)).toThrow(
			/Invalid regex delimiter/,
		);
	});
});

describe("splitWithDelimiter", () => {
	test("trims entries and drops blanks", () => {
		const delimiter = /--split--/g;
		const sample = " value a --split-- value b --split--  ";
		const result = splitWithDelimiter(sample, delimiter);
		expect(result).toEqual(["value a", "value b"]);
	});
});
