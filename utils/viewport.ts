/**
 * Get all elements currently visible in the viewport
 * @param root The root element to search within (default: document.body)
 * @param selector Optional CSS selector to filter elements (default: all visible elements with text)
 * @returns Array of HTMLElements visible in the viewport
 */
export function getElementsInViewport(
	root: HTMLElement = document.body,
	selector = "*",
): HTMLElement[] {
	const elements = Array.from(root.querySelectorAll<HTMLElement>(selector));
	const viewportElements: HTMLElement[] = [];

	for (const element of elements) {
		if (isElementInViewport(element)) {
			viewportElements.push(element);
		}
	}

	return viewportElements;
}

/**
 * Check if an element is currently visible in the viewport
 * @param element The element to check
 * @returns true if the element is in the viewport
 */
export function isElementInViewport(element: HTMLElement): boolean {
	const rect = element.getBoundingClientRect();
	return (
		rect.top >= 0 &&
		rect.left >= 0 &&
		rect.bottom <=
			(window.innerHeight || document.documentElement.clientHeight) &&
		rect.right <= (window.innerWidth || document.documentElement.clientWidth)
	);
}

/**
 * Check if an element intersects with the viewport (partially visible)
 * @param element The element to check
 * @returns true if any part of the element is visible in the viewport
 */
export function isElementIntersectingViewport(
	element: HTMLElement,
): boolean {
	const rect = element.getBoundingClientRect();
	return (
		rect.bottom > 0 &&
		rect.right > 0 &&
		rect.top <
			(window.innerHeight || document.documentElement.clientHeight) &&
		rect.left < (window.innerWidth || document.documentElement.clientWidth)
	);
}

/**
 * Check if an element is within a selection box
 * @param element The element to check
 * @param box The selection box with x, y, width, height
 * @returns true if the element intersects with the selection box
 */
export function isElementInSelectionBox(
	element: HTMLElement,
	box: { x: number; y: number; width: number; height: number },
): boolean {
	const rect = element.getBoundingClientRect();

	// Check if rectangles intersect
	return !(
		rect.right < box.x ||
		rect.left > box.x + box.width ||
		rect.bottom < box.y ||
		rect.top > box.y + box.height
	);
}

/**
 * Check if an element is fully contained within a selection box
 * @param element The element to check
 * @param box The selection box with x, y, width, height
 * @returns true if the element is fully contained in the selection box
 */
export function isElementFullyInSelectionBox(
	element: HTMLElement,
	box: { x: number; y: number; width: number; height: number },
): boolean {
	const rect = element.getBoundingClientRect();

	return (
		rect.left >= box.x &&
		rect.right <= box.x + box.width &&
		rect.top >= box.y &&
		rect.bottom <= box.y + box.height
	);
}
