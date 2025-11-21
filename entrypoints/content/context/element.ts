import { extractMarkdownContent } from "~/utils/markdown";
import type { TextContext } from "~/utils/types";

/**
 * Extracts the markdown content of an element and the surrounding text content.
 * @param element The HTML element to extract the context from.
 * @returns An object containing the text before, after, and the markdown content of the element.
 */
export const extractTextContext = (element: HTMLElement): TextContext => {
	let before = element.previousSibling
		? (element.previousSibling.textContent || "").trim()
		: "";
	let after = element.nextSibling
		? (element.nextSibling.textContent || "").trim()
		: "";

	if (before.length > 100) {
		before = `...${before.slice(-100)}`;
	}
	if (after.length > 100) {
		after = `${after.slice(0, 100)}...`;
	}

	return {
		text: extractMarkdownContent(element),
		surr: {
			before: before || undefined,
			after: after || undefined,
		},
	};
};
