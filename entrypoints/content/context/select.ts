export const extractContextFromSelection = (
	selection: Selection,
): TextContext | null => {
	if (!selection || selection.rangeCount === 0) {
		return null;
	}

	if (!selection || selection.rangeCount === 0) {
		return null;
	}

	const range = selection.getRangeAt(0);
	const selectedText = range.toString();

	const preSelectionRange = document.createRange();
	preSelectionRange.setStart(range.commonAncestorContainer, 0);
	preSelectionRange.setEnd(range.startContainer, range.startOffset);
	const beforeText = preSelectionRange.toString();

	const postSelectionRange = document.createRange();
	postSelectionRange.selectNodeContents(range.commonAncestorContainer);
	postSelectionRange.setStart(range.endContainer, range.endOffset);
	const afterText = postSelectionRange.toString();

	return {
		text: selectedText,
		surr: {
			before: beforeText || undefined,
			after: afterText || undefined,
		},
	};
};
