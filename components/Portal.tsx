/** biome-ignore-all lint/suspicious/noAssignInExpressions: Copied code */
/** biome-ignore-all lint/complexity/noBannedTypes: Copied code */
/** biome-ignore-all lint/style/noNonNullAssertion: Copied code */
/** biome-ignore-all lint/suspicious/noExplicitAny: Copied code */
import { getOwner, type JSX, runWithOwner, sharedConfig } from "solid-js";
import { insert } from "solid-js/web";

/**
 * Renders components somewhere else in the DOM
 *
 * Useful for inserting modals and tooltips outside of an cropping layout. If no mount point is given, the portal is inserted in document.body; it is wrapped in a `<div>` unless the target is document.head or `isSVG` is true. setting `useShadow` to true places the element in a shadow root to isolate styles.
 *
 * @description https://docs.solidjs.com/reference/components/portal
 */
export function MPortal<
	T extends boolean = false,
	S extends boolean = false,
>(props: {
	mount?: Node;
	useShadow?: T;
	isSVG?: S;
	ref?:
		| (S extends true ? SVGGElement : HTMLDivElement)
		| ((
				el: (T extends true ? { readonly shadowRoot: ShadowRoot } : {}) &
					(S extends true ? SVGGElement : HTMLDivElement),
		  ) => void);
	children: JSX.Element;
}) {
	const { useShadow } = props,
		marker = document.createTextNode(""),
		mount = () => props.mount || document.body,
		owner = getOwner();
	let content: undefined | (() => JSX.Element);
	let hydrating = !!sharedConfig.context;

	createEffect(
		() => {
			// basically we backdoor into a sort of renderEffect here
			if (hydrating) (getOwner() as any).user = hydrating = false;
			content ||
				(content = runWithOwner(owner, () => createMemo(() => props.children)));
			const el = mount();
			if (el instanceof HTMLHeadElement) {
				const [clean, setClean] = createSignal(false);
				const cleanup = () => setClean(true);
				createRoot((dispose) =>
					insert(el, () => (!clean() ? content!() : dispose()), null),
				);
				onCleanup(cleanup);
			} else {
				const container = createElement(props.isSVG ? "g" : "div", props.isSVG),
					renderRoot =
						useShadow && container.attachShadow
							? container.attachShadow({ mode: "open" })
							: container;

				Object.defineProperty(container, "_$host", {
					get() {
						return marker.parentNode;
					},
					configurable: true,
				});
				insert(renderRoot, content);
				el.appendChild(container);
				props.ref && (props as any).ref(container);
				onCleanup(() => {
					try {
						// We did modification here. In some cases, el has been cleared and removeChild will throw.
						el.removeChild(container);
					} catch {}
				});
			}
		},
		undefined,
		{ render: !hydrating },
	);
	return marker;
}

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function createElement(
	tagName: string,
	isSVG = false,
	is = undefined,
): HTMLElement | SVGElement {
	return isSVG
		? document.createElementNS(SVG_NAMESPACE, tagName)
		: document.createElement(tagName, { is });
}
