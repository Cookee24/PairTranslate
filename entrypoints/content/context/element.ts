import { extractMarkdownContent } from "~/utils/markdown";
import type { TextContext } from "~/utils/types";

export const extractTextContext = (node: Node): TextContext => {
	let before = node.previousSibling
		? (node.previousSibling.textContent || "").trim()
		: "";
	let after = node.nextSibling
		? (node.nextSibling.textContent || "").trim()
		: "";

	if (before.length > 100) {
		before = `...${before.slice(-100)}`;
	}
	if (after.length > 100) {
		after = `${after.slice(0, 100)}...`;
	}

	return {
		text: extractMarkdownContent(node),
		surr: {
			before: before || undefined,
			after: after || undefined,
		},
	};
};
