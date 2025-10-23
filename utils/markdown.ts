import { MathMLToLaTeX } from "@pie-framework/mathml-to-latex";
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

/**
 * Extracts the content of an element and converts nodes to markdown.
 * @param element The HTML element to extract and convert.
 * @returns A string containing the markdown representation of the element's content.
 */
export const extractMarkdownContent = (element: HTMLElement): string => {
	let markdownContent = "";
	// Process each direct child of the element
	for (const child of element.childNodes) {
		if (child.nodeType === Node.TEXT_NODE) {
			// Append text content without trimming to preserve spacing between elements
			markdownContent += child.textContent || "";
		} else if (child.nodeType === Node.ELEMENT_NODE) {
			const childElement = child as HTMLElement;
			const tagName = childElement.tagName.toLowerCase();
			switch (tagName) {
				case "strong":
				case "b":
					markdownContent += `**${extractMarkdownContent(childElement)}**`;
					break;
				case "em":
				case "i":
					markdownContent += `*${extractMarkdownContent(childElement)}*`;
					break;
				case "code":
					markdownContent += `\`${extractMarkdownContent(childElement)}\``;
					break;
				case "pre":
					// Code blocks with language detection if possible
					markdownContent += `\n\`\`\`\n${childElement.textContent || ""}\n\`\`\`\n`;
					break;
				case "a": {
					const href = childElement.getAttribute("href");
					const text = extractMarkdownContent(childElement);
					markdownContent += `[${text}](${href})`;
					break;
				}
				case "img": {
					// Skip
					break;
				}
				case "br":
					markdownContent += "\n\n"; // Markdown line break
					break;
				case "hr":
					markdownContent += "\n\n---\n\n"; // Horizontal rule
					break;
				case "h1":
					markdownContent += `# ${extractMarkdownContent(childElement)}\n\n`;
					break;
				case "h2":
					markdownContent += `## ${extractMarkdownContent(childElement)}\n\n`;
					break;
				case "h3":
					markdownContent += `### ${extractMarkdownContent(childElement)}\n\n`;
					break;
				case "h4":
					markdownContent += `#### ${extractMarkdownContent(childElement)}\n\n`;
					break;
				case "h5":
					markdownContent += `##### ${extractMarkdownContent(childElement)}\n\n`;
					break;
				case "h6":
					markdownContent += `###### ${extractMarkdownContent(childElement)}\n\n`;
					break;
				case "p":
					markdownContent += `${extractMarkdownContent(childElement)}\n\n`;
					break;
				case "blockquote":
					{
						// Add '> ' prefix to each line
						const quoteContent = extractMarkdownContent(childElement);
						markdownContent += `> ${quoteContent.split("\n").join("\n> ")}\n\n`;
					}
					break;
				case "ul":
				case "ol": {
					const isOrdered = childElement.tagName.toLowerCase() === "ol";
					const items = Array.from(
						childElement.querySelectorAll(":scope > li"),
					);
					items.forEach((item, index) => {
						const prefix = isOrdered ? `${index + 1}. ` : "- ";
						markdownContent += `${prefix}${extractMarkdownContent(item as HTMLElement)}\n`;
					});
					markdownContent += "\n";
					break;
				}
				case "li":
					// Handle nested lists - this case is for standalone li elements
					markdownContent += extractMarkdownContent(childElement);
					break;
				case "del":
				case "s":
				case "strike":
					markdownContent += `~~${extractMarkdownContent(childElement)}~~`;
					break;
				case "u":
					// Markdown doesn't have native underline, use HTML
					markdownContent += `<u>${extractMarkdownContent(childElement)}</u>`;
					break;
				case "mark":
					// Markdown doesn't have native highlight, use HTML or ==text==
					markdownContent += `==${extractMarkdownContent(childElement)}==`;
					break;
				case "sup":
					markdownContent += `[^${extractMarkdownContent(childElement)}]`;
					break;
				case "sub":
					markdownContent += `[_${extractMarkdownContent(childElement)}]`;
					break;

				case "script":
				case "style":
					break;
				// case "math":
				// case "span":
				// case "div":
				default:
					if (isMathElement(childElement, tagName)) {
						markdownContent += extractMathContent(childElement);
					} else {
						// Recursively process other HTML elements to extract their content
						markdownContent += extractMarkdownContent(childElement);
					}
					break;
			}
		}
	}

	return markdownContent;
};

/**
 * Checks if an element is a math-related element.
 */
const isMathElement = (element: HTMLElement, tagName: string): boolean => {
	// MathML elements
	if (
		tagName === "math" ||
		element.namespaceURI === "http://www.w3.org/1998/Math/MathML"
	) {
		return true;
	}

	// KaTeX/MathJax elements
	if (
		element.classList.contains("katex") ||
		element.classList.contains("katex-display") ||
		element.classList.contains("katex-html") ||
		element.classList.contains("MathJax") ||
		element.classList.contains("MathJax_Display") ||
		element.classList.contains("mathjax")
	) {
		return true;
	}

	// MathLive elements
	if (
		element.tagName === "MATH-FIELD" ||
		element.classList.contains("ML__mathlive")
	) {
		return true;
	}

	return false;
};

/**
 * Extracts math content and converts it to LaTeX format.
 */
const extractMathContent = (element: HTMLElement): string => {
	const getDollarWrapped = (isDisplay: boolean, content: string): string =>
		isDisplay ? `$$${content}$$` : `$${content}$`;

	// Try to get LaTeX from annotation or data attributes
	const latexFromAnnotation = element.querySelector(
		'annotation[encoding="application/x-tex"]',
	)?.textContent;
	if (latexFromAnnotation) {
		const isDisplay =
			element.getAttribute("display") === "block" ||
			element.classList.contains("katex-display") ||
			element.classList.contains("MathJax_Display");
		return getDollarWrapped(isDisplay, latexFromAnnotation);
	}

	// Check for data-latex attribute (common in KaTeX)
	const dataLatex = element.getAttribute("data-latex");
	if (dataLatex) {
		return getDollarWrapped(
			element.classList.contains("katex-display"),
			dataLatex,
		);
	}

	// MathLive math-field element
	if (element.tagName === "MATH-FIELD") {
		// biome-ignore lint/suspicious/noExplicitAny: General use case
		const value = element.getAttribute("value") || (element as any).value;
		if (value) {
			return `$${value}$`;
		}
	}

	// Try to extract from script tag (MathJax format)
	const scriptTag =
		element.querySelector('script[type="math/tex"]') ||
		element.querySelector('script[type="math/tex; mode=display"]');
	if (scriptTag) {
		const isDisplay =
			scriptTag.getAttribute("type") === "math/tex; mode=display";
		return getDollarWrapped(isDisplay, scriptTag.textContent || "");
	}

	// Convert MathML to LaTeX
	const mathMlElement = element.querySelector("[data-mathml]");
	const mathMl = mathMlElement?.getAttribute("data-mathml");
	if (mathMl) {
		try {
			const latex = MathMLToLaTeX.convert(mathMl);
			const isDisplay =
				element.getAttribute("display") === "block" ||
				element.classList.contains("katex-display") ||
				element.classList.contains("MathJax_Display");
			return getDollarWrapped(isDisplay, latex);
		} catch (error) {
			console.error("Failed to convert MathML to LaTeX:", error);
		}
	}

	// Try to convert MathML element itself
	if (
		element.tagName === "MATH" ||
		element.namespaceURI === "http://www.w3.org/1998/Math/MathML"
	) {
		try {
			const mathmlString = element.outerHTML;
			const latex = MathMLToLaTeX.convert(mathmlString);
			const isDisplay = element.getAttribute("display") === "block";
			return getDollarWrapped(isDisplay, latex);
		} catch (error) {
			console.error("Failed to convert MathML element to LaTeX:", error);
		}
	}

	// Fallback: extract plain text for MathML or other math elements
	const textContent = element.textContent || "";
	const isDisplay =
		element.getAttribute("display") === "block" ||
		element.classList.contains("katex-display") ||
		element.classList.contains("MathJax_Display");

	// If it's already wrapped in $, use as is
	if (textContent.trim().startsWith("$") && textContent.trim().endsWith("$")) {
		return textContent;
	}

	return getDollarWrapped(isDisplay, textContent);
};
