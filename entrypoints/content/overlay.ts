import type { JSX } from "solid-js";
import { render } from "solid-js/web";

let _root: ShadowRoot | undefined;

export const mountOverlay = (app: () => JSX.Element) => {
	if (_root) {
		return Promise.resolve(_root);
	}

	let { promise, resolve } = Promise.withResolvers<ShadowRoot>();
	promise = promise.then((el) => {
		render(app, el);
		_root = el instanceof ShadowRoot ? el : undefined;
		return el;
	});

	const loader = () =>
		requestAnimationFrame(async () => {
			const host = document.createElement("div");
			host.attachShadow({ mode: "open" });
			host.style.width = "0";
			host.style.height = "0";
			host.style.margin = "0";
			host.style.padding = "0";
			host.style.position = "fixed";
			host.style.zIndex = "2147483647";
			host.style.backgroundColor = "transparent";

			const root = host.shadowRoot;
			if (!root) {
				throw new Error("Failed to attach shadow root to body");
			}

			const [documentCss, shadowCss] = await window.rpc.getContentStyles();
			if (documentCss) {
				const styleEl = document.createElement("style");
				styleEl.setAttribute(STYLE_CONTAINER, "");
				styleEl.textContent = documentCss;
				document.head.appendChild(styleEl);
			}
			if (shadowCss) {
				const styleEl = document.createElement("style");
				styleEl.setAttribute(STYLE_CONTAINER, "");
				styleEl.textContent = shadowCss;
				root.appendChild(styleEl);
			}

			document.body.appendChild(host);

			resolve(root);
		});

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", loader, { once: true });
	} else {
		loader();
	}

	return promise;
};
