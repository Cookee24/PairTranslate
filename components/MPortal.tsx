import {
	createEffect,
	createMemo,
	getOwner,
	type JSX,
	onCleanup,
	runWithOwner,
} from "solid-js";
import { insert } from "solid-js/web";
import { ELEMENT_CONTAINER } from "~/utils/constants";

export function InTextPortal(props: {
	mount: HTMLElement;
	ref?: (el: HTMLSpanElement) => void;
	// Whether to hide the original elements
	hideOriginal?: boolean;
	children: JSX.Element;
}) {
	const marker = document.createTextNode("");
	const owner = getOwner();
	let content: undefined | (() => JSX.Element);

	createEffect(() => {
		content ||= runWithOwner(owner, () => createMemo(() => props.children));

		const el = props.mount;
		if (!el) return;
		const container = document.createElement("div");
		container.setAttribute(ELEMENT_CONTAINER, "");

		Object.defineProperty(container, "_$host", {
			get() {
				return marker.parentNode;
			},
			configurable: true,
		});

		if (props.hideOriginal) {
			const originalElements = Array.from(el.childNodes);
			el.textContent = "";
			onCleanup(() => {
				el.append(...originalElements);
			});
		}

		insert(container, content);
		el.appendChild(container);
		props.ref?.(container);

		onCleanup(() => {
			try {
				el.removeChild(container);
			} catch {}
		});
	});

	return marker;
}

export function ShadowPortal(props: {
	mount?: HTMLElement;
	ref?: (el: HTMLDivElement) => void;
	children: JSX.Element;
}) {
	const marker = document.createTextNode("");
	const owner = getOwner();
	const mount = () => props.mount || document.body;
	let content: undefined | (() => JSX.Element);

	createEffect(() => {
		content ||= runWithOwner(owner, () => createMemo(() => props.children));

		const el = mount();
		const container = document.createElement("div");
		const shadowRoot = container.attachShadow({ mode: "open" });

		Object.defineProperty(container, "_$host", {
			get() {
				return marker.parentNode;
			},
			configurable: true,
		});

		insert(shadowRoot, content);
		el.appendChild(container);
		props.ref?.(container);

		onCleanup(() => {
			try {
				el.removeChild(container);
			} catch {}
		});
	});

	return marker;
}
