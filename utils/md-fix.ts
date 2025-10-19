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
		let result = "";
		for (const char of str) {
			const code = char.charCodeAt(0);
			if (code === 0x3000) {
				// Ideographic space
				result += " ";
			} else if (code >= 0xff01 && code <= 0xff5e) {
				// Full-width ASCII
				result += String.fromCharCode(code - 0xfee0);
			} else if (char === "【") {
				result += "[";
			} else if (char === "】") {
				result += "]";
			} else {
				result += char; // Keep original character
			}
		}
		return result;
	};

	let fixedText = text;

	// 1. Contextually fix links and images: `[text](url)` and `![alt](url)`
	// This updated regex targets markdown link/image syntax with any combination
	// of full-width or half-width brackets and parentheses.
	// It finds any structure like `[text](url)`, `【text】(url)`, `[text]（url）`, etc.
	// The entire matched syntax is then passed to `toHalfWidth` for normalization.
	const linkRegex = /(!?[[【][^\]］]*[\]】])([（(][^）)]*[）)])/g;
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
