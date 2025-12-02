import {
	createEffect,
	createMemo,
	getOwner,
	type JSX,
	onCleanup,
	runWithOwner,
} from "solid-js";
import { insert } from "solid-js/web";
import { DATA_CONTAINER, DATA_HIDE, DATA_TRANSLATED } from "~/utils/constants";
import type { DOMSection } from "~/utils/parser/types";

export function TranslateNodePortal(props: {
	section: DOMSection;
	ref?: (el: HTMLDivElement) => void;
	hideOriginal?: boolean;
	children: JSX.Element;
}) {
	let content: undefined | (() => JSX.Element);
	const marker = document.createTextNode("");
	const owner = getOwner();

	createEffect(() => {
		content ??= runWithOwner(owner, () => createMemo(() => props.children));

		const [parent, insertAfter, startHide, endHide] = resolveDOMContext(
			props.section,
		);
		if (!parent) return;

		const container = document.createElement("div");
		container.setAttribute(DATA_CONTAINER, "");

		// Hack to enable event bubbling through the portal in Solid
		Object.defineProperty(container, "_$host", {
			get: () => marker.parentNode,
			configurable: true,
		});

		if (props.hideOriginal && startHide) {
			const restore = hideNodes(startHide, endHide);
			onCleanup(restore);
		}

		insert(container, content);
		parent.setAttribute(DATA_TRANSLATED, "");
		parent.insertBefore(
			container,
			insertAfter ? insertAfter.nextSibling : null,
		);
		props.ref?.(container);

		onCleanup(() => {
			parent.removeAttribute(DATA_TRANSLATED);
			container.remove();
		});
	});

	return marker;
}

function resolveDOMContext(section: DOMSection) {
	const isRange = Array.isArray(section);
	// If range, use the end node. If single, use the node itself.
	const refNode = isRange ? section[1] : section;

	// If the node itself is an element, we mount inside it (append).
	// Otherwise (text node), we mount to its parent.
	const isElement = refNode instanceof HTMLElement;
	const parent = isRange
		? refNode.parentElement
		: isElement
			? refNode
			: refNode.parentElement;

	// Determine where to start/end hiding and where to insert the new container
	let startHide: Node | null = null;
	let endHide: Node | null = null;
	let insertAfter: Node | null = null;

	if (isRange) {
		startHide = section[0];
		endHide = section[1];
		insertAfter = endHide;
	} else if (isElement) {
		// Single Element: Hide all children inside
		startHide = refNode.firstChild;
		endHide = refNode.lastChild;
		insertAfter = null; // Append to end of element
	} else {
		// Single Text Node: Hide just this node
		startHide = refNode;
		endHide = refNode;
		insertAfter = refNode; // Insert after this text node
	}

	return [parent, insertAfter, startHide, endHide] as const;
}

function hideNodes(start: Node, end: Node | null) {
	let current: Node | null = start;
	const elements: Element[] = [];
	const texts: [Text, string][] = [];

	while (current) {
		if (current instanceof Element) {
			current.setAttribute(DATA_HIDE, "");
			const el = current;
			elements.push(el);
		} else if (current instanceof Text) {
			const originalText = current.data;
			current.data = "";
			const textNode = current;
			texts.push([textNode, originalText]);
		}

		if (current === end) break;
		current = current.nextSibling;
	}

	return () => {
		for (const el of elements) {
			el.removeAttribute(DATA_HIDE);
		}
		for (const [textNode, originalText] of texts) {
			textNode.data = originalText;
		}
	};
}
