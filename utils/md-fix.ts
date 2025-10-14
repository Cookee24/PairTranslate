/**
 * Replace full-width characters with half-width characters in markdown syntax.
 */
export const fixMarkdown = (text: string): string => {
	if (!text) return text;
	/**
	 * Helper function to convert a string containing specific full-width
	 * characters to their half-width counterparts.
	 * @param str The string to convert.
	 * @returns The converted string.
	 */
	const toHalfWidth = (str: string): string => {
		return str.replace(/[\uFF01-\uFF5E\u3000]/g, (char) => {
			// Convert full-width ideographic space to a standard space
			if (char === "\u3000") {
				return " ";
			}
			// Convert other full-width characters in the range FF01-FF5E
			// by subtracting the offset 0xFEE0.
			return String.fromCharCode(char.charCodeAt(0) - 0xfee0);
		});
	};

	let fixedText = text;

	// 1. Contextually fix links and images: `[text](url)` and `![alt](url)`
	// This regex specifically targets the pattern of `[...]（...）`.
	// It only converts the full-width parentheses when they follow a
	// bracketed part, strongly indicating a markdown link or image.
	// The entire matched syntax is then converted to half-width.
	const linkRegex = /(!?[[［][^\]］]*[\]］])(（[^）]*）)/g;
	fixedText = fixedText.replace(linkRegex, (match) => toHalfWidth(match));

	// 2. Fix syntax at the beginning of lines (headings, blockquotes, lists)
	// This regex looks for syntax that must appear at the start of a line,
	// such as '＃' for headings, '＞' for blockquotes, or '＊' for lists.
	// The `m` flag enables multiline matching.
	const lineStartRegex = /^(＃+|＞+|[＊＋－]|\d+．)\s/gm;
	fixedText = fixedText.replace(lineStartRegex, (match) => toHalfWidth(match));

	// 3. Fix code fences and strikethroughs
	// These replacements are less contextual but target multi-character syntax
	// first (`｀｀｀`, `～～`) before single characters (`｀`) to ensure
	// correctness.
	fixedText = fixedText.replace(/｀｀｀/g, "```");
	fixedText = fixedText.replace(/～～/g, "~~");
	fixedText = fixedText.replace(/｀/g, "`");

	return fixedText;
};
