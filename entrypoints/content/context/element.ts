export const extractTextContext = (element: HTMLElement): TextContext => {
	const parent = element.parentElement;
	if (!parent) {
		return {
			before: "",
			after: "",
			content: extractTextContent(element),
		};
	}

	// Create a TreeWalker to efficiently traverse only the text nodes.
	const walker = document.createTreeWalker(
		parent,
		NodeFilter.SHOW_TEXT, // Only show text nodes to avoid content duplication.
	);

	let before = "";
	let after = "";

	// Iterate through each text node in the parent element.
	while (walker.nextNode()) {
		const node = walker.currentNode;

		// Skip any text nodes that are inside the target element itself,
		// as their content is already part of `element.textContent`.
		// Also exclude nodes within elements marked with the ELEMENT_CONTAINER attribute.
		if (
			element.contains(node) ||
			element.closest(EXCLUDED_SELECTORS.join(", "))
		) {
			continue;
		}

		// Use compareDocumentPosition to determine if the current node
		// comes before or after the target element in the document tree.
		const comparison = element.compareDocumentPosition(node);

		if (comparison & Node.DOCUMENT_POSITION_PRECEDING) {
			// The current node precedes the target element.
			before += node.textContent || "";
		} else if (comparison & Node.DOCUMENT_POSITION_FOLLOWING) {
			// The current node follows the target element.
			after += node.textContent || "";
		}
	}

	before = before.trim();
	after = after.trim();

	if (before.length > 100) {
		before = `...${before.slice(-100)}`;
	}
	if (after.length > 100) {
		after = `${after.slice(0, 100)}...`;
	}

	return {
		before,
		after,
		content: extractTextContent(element),
	};
};

export const extractTextContent = (element: HTMLElement): string => {
	return element.textContent.trim();
};
