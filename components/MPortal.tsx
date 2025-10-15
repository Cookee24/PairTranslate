import { getOwner, type JSX, runWithOwner } from "solid-js";
import { insert } from "solid-js/web";

/**
 * Renders components in a shadow DOM attached to the target element
 */
export function MPortal(props: {
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
		const container = document.createElement("span");

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
