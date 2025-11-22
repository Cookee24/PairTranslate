import z from "zod";

import batch from "./prompt/batch-system.md?raw";
import batchUser from "./prompt/batch-user.md?raw";
import dictionary from "./prompt/dictionary-system.md?raw";
import dictionaryUser from "./prompt/dictionary-user.md?raw";
import explain from "./prompt/explain-system.md?raw";
import explainUser from "./prompt/explain-user.md?raw";
import input from "./prompt/input-system.md?raw";
import inputUser from "./prompt/input-user.md?raw";
import prefix from "./prompt/prefix-system.md?raw";
import unary from "./prompt/unary-system.md?raw";
import unaryUser from "./prompt/unary-user.md?raw";

export const UNARY = () => ({
	system: `${prefix}\n\n${unary}`,
	user: unaryUser,
});
export const BATCH = () => ({
	system: `${prefix}\n\n${batch}`,
	user: batchUser,
});
export const INPUT = () => ({
	system: `${prefix}\n\n${input}`,
	user: inputUser,
});
export const EXPLAIN = () => ({ system: explain, user: explainUser });
export const DICTIONARY = () => ({
	system: dictionary,
	user: dictionaryUser,
});

const ExplainOutput = () =>
	z.object({
		context_explanation: z.string(),
		text_explanation: z.string(),
		examples: z
			.array(
				z.object({
					text: z.string(),
					translation: z.string(),
				}),
			)
			.optional(),
	});
export type ExplainOutput = z.infer<ReturnType<typeof ExplainOutput>>;

export const EXPLAIN_SCHEMA = () => z.toJSONSchema(ExplainOutput());
