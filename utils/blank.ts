export const hasMeaningfulChars = (
	text: string | null | undefined,
): boolean => {
	return (
		text !== null &&
		text !== undefined &&
		text.trim().length > 0 &&
		!/^[\d\s\-_.,;:!?()[\]{}'"]*$/.test(text)
	);
};
