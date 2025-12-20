export type SelectionPoint = { x: number; y: number };
export type SelectionBox = {
	x: number;
	y: number;
	width: number;
	height: number;
};

type ElementRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

const getElementRect = (element: Element): ElementRect => {
	const rect = element.getBoundingClientRect();
	return {
		x: rect.x + window.scrollX,
		y: rect.y + window.scrollY,
		width: rect.width,
		height: rect.height,
	};
};

const rectIntersectsBox = (rect: ElementRect, box: SelectionBox): boolean =>
	rect.x < box.x + box.width &&
	rect.x + rect.width > box.x &&
	rect.y < box.y + box.height &&
	rect.y + rect.height > box.y;

const rectContainsPoint = (rect: ElementRect, point: SelectionPoint): boolean =>
	point.x >= rect.x &&
	point.x <= rect.x + rect.width &&
	point.y >= rect.y &&
	point.y <= rect.y + rect.height;

export const shouldIncludeElementInSelectionBox = (
	element: Element,
	box: SelectionBox,
): boolean => {
	const rect = getElementRect(element);
	if (rect.width === 0 && rect.height === 0) return true;
	return rectIntersectsBox(rect, box);
};

export const shouldIncludeElementAtPoint = (
	element: Element,
	point: SelectionPoint,
): boolean => {
	const rect = getElementRect(element);
	if (rect.width === 0 && rect.height === 0) return true;
	return rectContainsPoint(rect, point);
};
