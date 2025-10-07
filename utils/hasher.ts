import type { PageContext, TextContext } from "./types";

const encoder = new TextEncoder();
export const generateCacheKey = async (
	operation: string,
	modelId: string,
	textContext: TextContext,
	pageContext?: PageContext,
) => {
	let str = `${operation}|${modelId}|`;
	if (textContext.before) str += `${textContext.before}♇`;
	str += `${textContext.content}♇`;
	if (textContext.after) str += `${textContext.after}♇`;

	if (pageContext) {
		// For hit rate, we only hash the domain of the page context
		str += pageContext.domain;
	}

	const buf = await crypto.subtle.digest("SHA-256", encoder.encode(str));
	return buf;
};
