import type { TranslateContext } from "./types";

const encoder = new TextEncoder();
export const computeCacheKey = async (
	promptId: string,
	modelId: string,
	text: string | string[] = "",
	ctx: TranslateContext,
) => {
	const D = "\u200C"; // Zero-width non-joiner to separate fields
	let str = `${promptId}${modelId}${D}${Array.isArray(text) ? text.join(D) : text}${D}`;
	if (ctx.surr) {
		if (ctx.surr.before) str += `${ctx.surr.before}${D}`;
		if (ctx.surr.after) str += `${ctx.surr.after}${D}`;
	}

	if (ctx.page) {
		// For hit rate, we only hash the domain of the page context
		str += ctx.page.domain;
	}

	const buf = await crypto.subtle.digest("SHA-256", encoder.encode(str));
	return buf;
};
