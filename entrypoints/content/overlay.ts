import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { ELEMENT_CONTAINER, STYLE_CONTAINER } from "~/utils/constants";

let _dispose: (() => void) | null = null;

export const mountOverlay = (app: () => JSX.Element) => {
	const container = document.createElement("div");
	container.style.display = "contents";
	container.setAttribute(ELEMENT_CONTAINER, "");
	const root = container.attachShadow({ mode: "open" });

	window.rpc
		.getContentStyles()
		.then(([documentCss, shadowCss]: [string, string]) =>
			requestAnimationFrame(() => {
				const styleEl = document.createElement("style");
				styleEl.textContent = documentCss;
				styleEl.setAttribute(STYLE_CONTAINER, "");
				document.head.appendChild(styleEl);

				const shadowStyleEl = document.createElement("style");
				shadowStyleEl.textContent = shadowCss;
				shadowStyleEl.setAttribute(STYLE_CONTAINER, "");
				root.appendChild(shadowStyleEl);

				document.body.appendChild(container);

				_dispose?.();
				const solidDispose = render(app, root);
				_dispose = () => {
					solidDispose();
					document.body.removeChild(container);
					document.head.removeChild(styleEl);
					_dispose = null;
				};
			}),
		);

	return () => _dispose?.();
};
