const REGEX = /^[\d\s\-_.,;:!?()[\]{}'"]*$/;

export const hasMeaningfulChars = (
	text: string | null | undefined,
): boolean => {
	return (
		text !== null &&
		text !== undefined &&
		text.trim().length > 1 &&
		!REGEX.test(text)
	);
};
