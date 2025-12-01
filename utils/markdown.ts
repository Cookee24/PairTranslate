import { MathMLToLaTeX } from "mathml-to-latex";
import type { DOMSection } from "./parser/types";
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

type ElementHandler = (
	element: HTMLElement,
) => Generator<string, void, unknown>;

/**
 * Main generator function to traverse the DOM node.
 */
function* iterateMarkdown(node: Node): Generator<string, void, unknown> {
	// 1. Handle Text Nodes
	if (node.nodeType === Node.TEXT_NODE) {
		const text = node.nodeValue || "";

		yield text.replace(/\s+/g, " ");
	}
	// 2. Handle Element Nodes
	else if (node.nodeType === Node.ELEMENT_NODE) {
		const element = node as HTMLElement;
		const tagName = element.tagName.toLowerCase();

		const handler = tagHandlers[tagName];

		if (handler) {
			yield* handler(element);
		} else {
			yield* iterateChildren(element);
		}
	}
}

/**
 * Helper to iterate over child nodes.
 */
function* iterateChildren(
	element: HTMLElement,
): Generator<string, void, unknown> {
	for (const child of element.childNodes) {
		yield* iterateMarkdown(child);
	}
}

/**
 * Consumes the generator output for an element and returns a trimmed string.
 * Used for inline elements where the result must be captured immediately (e.g., inside **bold**).
 */
const consumeAndTrim = (element: HTMLElement): string => {
	const parts: string[] = [];
	for (const part of iterateChildren(element)) {
		parts.push(part);
	}
	return parts.join("").trim();
};

/**
 * Helper to handle generic block elements (div, section, etc.)
 * Checks for math content first, then falls back to children iteration.
 */
function* handleGenericBlock(
	el: HTMLElement,
	tagName: string,
): Generator<string> {
	// Check if this block is actually a wrapper for Math (Katex/MathJax)
	const mathContent = tryExtractMath(el, tagName);
	if (mathContent) {
		yield mathContent;
		return;
	}

	// Standard block handling
	const content = consumeAndTrim(el);
	if (content) {
		yield `${content}\n\n`;
	}
}

/**
 * Helper to handle generic inline elements (span).
 */
function* handleGenericInline(
	el: HTMLElement,
	tagName: string,
): Generator<string> {
	const mathContent = tryExtractMath(el, tagName);
	if (mathContent) {
		yield mathContent;
		return;
	}
	yield* iterateChildren(el);
}

const tagHandlers: Record<string, ElementHandler> = {
	// --- Inline Styles ---
	strong: function* (el) {
		yield `**${consumeAndTrim(el)}**`;
	},
	b: function* (el) {
		yield `**${consumeAndTrim(el)}**`;
	},
	em: function* (el) {
		yield `*${consumeAndTrim(el)}*`;
	},
	i: function* (el) {
		yield `*${consumeAndTrim(el)}*`;
	},
	del: function* (el) {
		yield `~~${consumeAndTrim(el)}~~`;
	},
	s: function* (el) {
		yield `~~${consumeAndTrim(el)}~~`;
	},
	strike: function* (el) {
		yield `~~${consumeAndTrim(el)}~~`;
	},
	code: function* (el) {
		yield `\`${consumeAndTrim(el)}\``;
	},

	// --- Media & Links ---
	a: function* (el) {
		const href = el.getAttribute("href") || "#";
		const text = consumeAndTrim(el);
		yield `[${text}](${href})`;
	},
	img: function* () {
		// Explicitly ignore images based on requirement,
	},
	br: function* () {
		yield "  \n";
	},

	// --- Block Elements ---
	p: function* (el) {
		// Paragraphs can also contain display math in some editors
		yield* handleGenericBlock(el, "p");
	},
	span: function* (el) {
		yield* handleGenericInline(el, "span");
	},
	div: function* (el) {
		yield* handleGenericBlock(el, "div");
	},
	section: function* (el) {
		yield* handleGenericBlock(el, "section");
	},

	// --- Specific Math Tags ---
	math: function* (el) {
		const latex = tryExtractMath(el, "math");
		if (latex) yield latex;
	},
	"mjx-container": function* (el) {
		const latex = tryExtractMath(el, "mjx-container");
		if (latex) yield latex;
	},
	"math-field": function* (el) {
		const latex = tryExtractMath(el, "math-field");
		if (latex) yield latex;
	},

	// --- Headings ---
	h1: function* (el) {
		yield* handleHeading(el, 1);
	},
	h2: function* (el) {
		yield* handleHeading(el, 2);
	},
	h3: function* (el) {
		yield* handleHeading(el, 3);
	},
	h4: function* (el) {
		yield* handleHeading(el, 4);
	},
	h5: function* (el) {
		yield* handleHeading(el, 5);
	},
	h6: function* (el) {
		yield* handleHeading(el, 6);
	},

	// --- Complex Blocks ---
	blockquote: function* (el) {
		const quote = consumeAndTrim(el);
		if (quote) {
			// Prepends '> ' to every new line
			yield `> ${quote.replace(/\n/g, "\n> ")}\n\n`;
		}
	},
	hr: function* () {
		yield "\n---\n\n";
	},

	// --- Lists ---
	ul: function* (el) {
		yield* handleList(el, false);
	},
	ol: function* (el) {
		yield* handleList(el, true);
	},
	li: function* (el) {
		// Fallback for standalone LI, though usually handled by UL/OL
		yield `- ${consumeAndTrim(el)}\n`;
	},

	pre: function* (el) {
		const codeEl = el.querySelector("code");
		let lang = "";
		let codeText = el.textContent || "";

		if (codeEl) {
			codeText = codeEl.textContent || "";
			codeEl.classList.forEach((cls) => {
				if (cls.startsWith("language-")) {
					lang = cls.replace("language-", "");
				}
			});
		}
		yield `\n\`\`\`${lang}\n${codeText}\n\`\`\`\n\n`;
	},

	// --- Tables  ---
	table: function* (el) {
		const table = el as HTMLTableElement;

		const rows = table.rows;
		if (rows.length === 0) return;

		const headerCells = rows[0].cells;

		const safeCell = (cell: Element) =>
			consumeAndTrim(cell as HTMLElement).replace(/\|/g, "\\|");

		let headerRow = "| ";
		let dividerRow = "| ";
		for (let i = 0; i < headerCells.length; i++) {
			headerRow += safeCell(headerCells[i]);
			dividerRow += "---";

			if (i < headerCells.length - 1) {
				headerRow += " | ";
				dividerRow += " | ";
			}
		}

		yield `${headerRow}\n${dividerRow}\n`;

		for (let i = 1; i < rows.length; i++) {
			const cells = rows[i].cells;
			let rowText = "| ";
			for (let j = 0; j < cells.length; j++) {
				rowText += safeCell(cells[j]);
				if (j < cells.length - 1) {
					rowText += " | ";
				}
			}
			yield `${rowText}\n`;
		}
		yield "\n";
	},

	script: function* () {},
	style: function* () {},
	noscript: function* () {},
};

function* handleHeading(el: HTMLElement, level: number): Generator<string> {
	yield `${"#".repeat(level)} ${consumeAndTrim(el)}\n\n`;
}

function* handleList(el: HTMLElement, isOrdered: boolean): Generator<string> {
	let index = 1;
	for (const child of el.children) {
		// Only process actual LI elements
		if (child.tagName.toLowerCase() !== "li") continue;

		const liContent = consumeAndTrim(child as HTMLElement);
		const indentedContent = liContent.replace(/\n/g, "\n    ");
		const prefix = isOrdered ? `${index}. ` : "- ";

		yield `${prefix}${indentedContent}\n`;
		index++;
	}
	yield "\n";
}

/**
 * Helper to wrap content safely in LaTeX delimiters.
 */
const wrapLatex = (content: string, isDisplay: boolean): string => {
	const trimmed = content.trim();
	// Prevent double wrapping
	if (
		(trimmed.startsWith("$") && trimmed.endsWith("$")) ||
		(trimmed.startsWith("\\(") && trimmed.endsWith("\\)")) ||
		(trimmed.startsWith("\\[") && trimmed.endsWith("\\]"))
	) {
		return trimmed;
	}
	// Add zero-width space to prevent trimming issues in parent consumers
	return isDisplay ? `\u200B\n$$\n${trimmed}\n$$\n\u200B` : `$${trimmed}$`;
};

/**
 * Main entry to attempt extracting math.
 * Returns the final LaTeX string (wrapped) if recognized, or null.
 */
const tryExtractMath = (
	element: HTMLElement,
	tagName: string,
): string | null => {
	const classList = element.classList;

	let latex = "";
	let isDisplay = false;

	if (tagName === "script") {
		const type = element.getAttribute("type");
		if (type === "math/tex; mode=display") {
			return wrapLatex(element.textContent || "", true);
		}
		if (type === "math/tex") {
			return wrapLatex(element.textContent || "", false);
		}
		if (type === "math/mml") {
			const id = element.id;
			if (id && document.getElementById(`${id}-Frame`)) {
				return null;
			}
			try {
				return wrapLatex(MathMLToLaTeX.convert(element.innerHTML), false);
			} catch (_e) {
				return null;
			}
		}
		return null;
	}

	if (tagName === "math") {
		// Check 'alttext' attribute (common in LaTeXML)
		const alttext = element.getAttribute("alttext");
		if (alttext) {
			isDisplay = element.getAttribute("display") === "block";
			return wrapLatex(alttext, isDisplay);
		}

		// Final fallback: Convert the MathML element itself
		try {
			latex = MathMLToLaTeX.convert(element.outerHTML);
			isDisplay = element.getAttribute("display") === "block";
			return wrapLatex(latex, isDisplay);
		} catch (_e) {
			// Sometime MathMLToLaTeX fails on complex namespaces, return generic fallback if needed
		}
	}

	if (classList.contains("mwe-math-element")) {
		// Wikimedia usually provides an IMG with the tex in the 'alt' attribute.
		// This is much faster than parsing the hidden MathML.
		const img = element.querySelector(
			"img.mwe-math-fallback-image-inline, img.mwe-math-fallback-image-display",
		);
		if (img) {
			const alt = img.getAttribute("alt");
			if (alt) {
				isDisplay =
					classList.contains("mwe-math-element-display") ||
					img.classList.contains("mwe-math-fallback-image-display");
				return wrapLatex(alt, isDisplay);
			}
		}
		// Fallback: Check hidden MathML inside
		const hiddenMath = element.querySelector("math");
		if (hiddenMath) {
			return tryExtractMath(hiddenMath as HTMLElement, "math");
		}
	}

	const texAnnotation = element.querySelector(
		'annotation[encoding="application/x-tex"], annotation[encoding="application/x-latex"]',
	);
	if (texAnnotation?.textContent) {
		// Determine display mode based on parent context or attributes
		isDisplay =
			element.getAttribute("display") === "block" ||
			element.getAttribute("mode") === "display" ||
			classList.contains("display") ||
			classList.contains("block");

		return wrapLatex(texAnnotation.textContent, isDisplay);
	}

	const dataMathml = element.getAttribute("data-mathml");
	if (dataMathml) {
		try {
			// Convert the stored MathML string to LaTeX
			latex = MathMLToLaTeX.convert(dataMathml);

			// Detect display mode: MathJax usually puts display="block" in the root math tag
			// or the container has class "MathJax_Display"
			isDisplay =
				classList.contains("MathJax_Display") ||
				dataMathml.includes('display="block"');

			return wrapLatex(latex, isDisplay);
		} catch (e) {
			console.warn("Failed to convert data-mathml", e);
		}
	}

	if (classList.contains("MathJax_Preview")) {
		// Ignore previews, return empty string so it doesn't get processed as text
		return "";
	}

	return null;
};

/**
 * Public Entry Point
 */
export const extractMarkdownContent = (section: DOMSection): string => {
	if (Array.isArray(section)) {
		const [start, end] = section;
		const parts: string[] = [];
		let current: Node | null = start;
		while (current) {
			parts.push(...Array.from(iterateMarkdown(current)));
			if (current === end) break;
			current = current.nextSibling;
		}

		return parts.join("");
	} else if (section.nodeType === Node.TEXT_NODE) {
		return section.nodeValue?.trim() || "";
	} else {
		return Array.from(iterateChildren(section as HTMLElement)).join("");
	}
};
