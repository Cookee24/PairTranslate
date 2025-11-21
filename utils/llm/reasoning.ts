export const appendReasoningContent = (
	base: string | undefined,
	next?: string,
): string | undefined => {
	if (!next) {
		return base;
	}
	return base ? base + next : next;
};
