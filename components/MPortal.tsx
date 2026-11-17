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
	dir?: "rtl" | "ltr";
	/** Render as its own block so it can align to its own direction. */
	block?: boolean;
	children: JSX.Element;
}) {
	let content: undefined | (() => JSX.Element);
	const marker = document.createTextNode("");
	const owner = getOwner();

	createEffect(() => {
		content ??= runWithOwner(owner, () => createMemo(() => props.children));

		const start = props.section[0];
		const end = props.section[1];
		const parent = start.parentElement;
		if (!parent) return;

		const container = document.createElement("div");
		container.setAttribute(DATA_CONTAINER, "");
		if (props.dir) container.dir = props.dir;
		if (props.block) {
			// The container is `display: contents` by default, which leaves the
			// text aligned by the page's paragraph.
			container.style.display = "block";
			// A physical alignment (e.g. `left`) inherited from the page would
			// pin RTL text to the wrong side; follow the translation's direction.
			const align = getComputedStyle(parent).textAlign;
			if (align === "left" || align === "right") {
				container.style.textAlign = "start";
			}
		}

		// Hack to enable event bubbling through the portal in Solid
		Object.defineProperty(container, "_$host", {
			get: () => marker.parentNode,
			configurable: true,
		});

		if (props.hideOriginal) {
			const restore = hideNodes(start, end);
			onCleanup(restore);
		}

		insert(container, content);
		parent.setAttribute(DATA_TRANSLATED, "");
		parent.insertBefore(container, end.nextSibling);
		props.ref?.(container);

		onCleanup(() => {
			parent.removeAttribute(DATA_TRANSLATED);
			container.remove();
		});
	});

	return marker;
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
