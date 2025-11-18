const encoder = new TextEncoder();
export const generateCacheKey = async (
	promptId: string,
	modelId: string,
	textContext: TextContext,
	pageContext?: PageContext,
) => {
	const D = "\u200C"; // Zero-width non-joiner to separate fields
	let str = `${promptId}${modelId}${D}${textContext.text}${D}`;
	if (textContext.surr) {
		if (textContext.surr.before) str += `${textContext.surr.before}${D}`;
		if (textContext.surr.after) str += `${textContext.surr.after}${D}`;
	}

	if (pageContext) {
		// For hit rate, we only hash the domain of the page context
		str += pageContext.domain;
	}

	const buf = await crypto.subtle.digest("SHA-256", encoder.encode(str));
	return buf;
};
