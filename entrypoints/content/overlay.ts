import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import styles from "~/assets/shadow.css?inline";

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

	const loader = () => {
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

		const { documentCss, shadowCss } = splitShadowRootCss(styles);
		if (documentCss) {
			const styleEl = document.createElement("style");
			styleEl.textContent = documentCss;
			document.head.appendChild(styleEl);
		}
		if (shadowCss) {
			const styleEl = document.createElement("style");
			styleEl.textContent = shadowCss;
			root.appendChild(styleEl);
		}

		document.body.appendChild(host);

		resolve(root);
	};

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", loader, { once: true });
	} else {
		loader();
	}

	return promise;
};

const splitShadowRootCss = (css: string) => {
	let shadowCss = css;
	let documentCss = "";
	const pos = [];
	const pattern = "@property";

	for (let i = 0; i < shadowCss.length; i++) {
		i = shadowCss.indexOf(pattern, i);
		if (i === -1) break;
		const l = i;
		i += pattern.length;
		while (true) {
			while (i + 1 < shadowCss.length && shadowCss[i] !== "}") i++;
			while (
				i + 1 < shadowCss.length &&
				(shadowCss[i + 1] === " " ||
					shadowCss[i + 1] === "\n" ||
					shadowCss[i + 1] === "\t")
			)
				i++;
			if (
				shadowCss[i + 1] === "@" &&
				shadowCss.slice(i + 1, i + 1 + pattern.length) === pattern
			) {
				i += pattern.length + 1;
			} else {
				break;
			}
		}
		const r = i + 1;
		pos.push([l, r]);
	}

	for (let i = pos.length - 1; i >= 0; i--) {
		const [l, r] = pos[i];
		documentCss += shadowCss.slice(l, r);
	}

	for (let i = pos.length - 1; i >= 0; i--) {
		const [l, r] = pos[i];
		shadowCss = shadowCss.slice(0, l) + shadowCss.slice(r);
	}

	return {
		documentCss: documentCss.trim(),
		shadowCss: shadowCss.trim(),
	};
};
