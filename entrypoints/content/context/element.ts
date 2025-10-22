/**
 * Extracts the markdown content of an element and the surrounding text content.
 * @param element The HTML element to extract the context from.
 * @returns An object containing the text before, after, and the markdown content of the element.
 */
export const extractTextContext = (element: HTMLElement): TextContext => {
	let before = element.previousSibling
		? (element.previousSibling.textContent || "").trim()
		: "";
	let after = element.nextSibling
		? (element.nextSibling.textContent || "").trim()
		: "";

	if (before.length > 100) {
		before = `...${before.slice(-100)}`;
	}
	if (after.length > 100) {
		after = `${after.slice(0, 100)}...`;
	}

	return {
		before,
		after,
		content: extractMarkdownContent(element),
	};
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
			switch (childElement.tagName.toLowerCase()) {
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
				case "span":
				case "div":
					// Process content without special formatting
					markdownContent += extractMarkdownContent(childElement);
					break;
				default:
					// Recursively process other HTML elements to extract their content
					markdownContent += extractMarkdownContent(childElement);
					break;
			}
		}
	}

	return markdownContent;
};
