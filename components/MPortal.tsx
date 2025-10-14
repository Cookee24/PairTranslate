import { getOwner, type JSX, runWithOwner } from "solid-js";
import { insert } from "solid-js/web";

/**
 * Renders components in a shadow DOM attached to the target element
 */
export function MPortal(props: {
	mount: HTMLElement;
	ref?: (el: HTMLSpanElement) => void;
	// Whether to wrap the original elements
	wrapOriginal?: boolean;
	// Whether to hide the original elements, only works if original is wrapped
	hideOriginal?: boolean;
	children: JSX.Element;
}) {
	const marker = document.createTextNode("");
	const owner = getOwner();
	let content: undefined | (() => JSX.Element);
	let originalWrapper: HTMLElement | undefined;

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

		if (props.wrapOriginal) {
			originalWrapper = document.createElement("div");
			originalWrapper.style.display = "contents";
			originalWrapper.append(...el.childNodes);
			el.appendChild(originalWrapper);
			onCleanup(() => {
				if (originalWrapper) {
					el.append(...originalWrapper.childNodes);
					el.removeChild(originalWrapper);
					originalWrapper = undefined;
				}
			});
		}

		if (props.hideOriginal && originalWrapper) {
			originalWrapper.style.display = "none";
			onCleanup(() => {
				if (originalWrapper) originalWrapper.style.display = "contents";
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
