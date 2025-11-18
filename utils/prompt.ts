import z from "zod";

import batch from "./prompt/batch-system.md?inline";
import batchUser from "./prompt/batch-user.md?inline";
import explain from "./prompt/explain-system.md?inline";
import explainUser from "./prompt/explain-user.md?inline";
import input from "./prompt/input-system.md?inline";
import inputUser from "./prompt/input-user.md?inline";
import prefix from "./prompt/prefix-system.md?inline";
import unary from "./prompt/unary-system.md?inline";
import unaryUser from "./prompt/unary-user.md?inline";

export const UNARY = { system: `${prefix}\n\n${unary}`, user: unaryUser };
export const BATCH = { system: `${prefix}\n\n${batch}`, user: batchUser };
export const INPUT = { system: `${prefix}\n\n${input}`, user: inputUser };
export const EXPLAIN = { system: explain, user: explainUser };

export const BATCH_SCHEMA = z.toJSONSchema(
	z.array(
		z.string().meta({
			description: "List of translated paragraphs.",
		}),
	),
);

const ExplainOutput = z.object({
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
export type ExplainOutput = z.infer<typeof ExplainOutput>;

export const EXPLAIN_SCHEMA = z.toJSONSchema(ExplainOutput);
