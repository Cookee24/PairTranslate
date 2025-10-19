export const isInput = (element: HTMLElement) =>
	element.tagName === "INPUT" ||
	element.tagName === "TEXTAREA" ||
	element.isContentEditable ||
	element.getAttribute("role") === "textbox";
