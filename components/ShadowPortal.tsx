import { getOwner, type JSX, runWithOwner } from "solid-js";
import { insert } from "solid-js/web";

/**
 * Renders components in a shadow DOM attached to the target element
 */
export function ShadowPortal(props: {
	mount: HTMLElement;
	ref?: (el: HTMLDivElement & { readonly shadowRoot: ShadowRoot }) => void;
	children: JSX.Element;
}) {
	const marker = document.createTextNode("");
	const mount = () => props.mount;
	const owner = getOwner();
	let content: undefined | (() => JSX.Element);

	createEffect(() => {
		content ||= runWithOwner(owner, () => createMemo(() => props.children));

		const el = mount();
		if (!el) return;
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
		props.ref?.(
			container as HTMLDivElement & { readonly shadowRoot: ShadowRoot },
		);

		onCleanup(() => {
			try {
				el.removeChild(container);
			} catch {}
		});
	});

	return marker;
}
