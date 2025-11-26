import { onCleanup, onMount } from "solid-js";
import { browser } from "#imports";
import {
	DATA_CONTAINER,
	DATA_GRABBING_CONTAINER,
	DATA_PREVENT_SCROLL,
	DATA_STYLE,
	DATA_TRANSLATED,
} from "~/utils/constants";

export const ContentStyle = () => {
	onMount(() => {
		const style = document.createElement("style");
		style.setAttribute(DATA_STYLE, "");
		style.textContent = `[${DATA_CONTAINER}] {
	display: contents; 
} 
[${DATA_TRANSLATED}] { 
	-webkit-line-clamp: unset !important; 
	max-height: unset !important; 
}
[${DATA_PREVENT_SCROLL}] {
	overflow: hidden !important;
}
[${DATA_GRABBING_CONTAINER}] {
	cursor: grabbing !important;
	user-select: none !important;
}
`;

		document.head.appendChild(style);
		onCleanup(() => document.head.removeChild(style));
	});

	return null;
};

export const KatexStyle = () => {
	onMount(() => {
		const link = document.createElement("link");
		const url = browser.runtime.getURL("/katex/katex.min.css");
		link.setAttribute(DATA_STYLE, "");
		link.setAttribute("rel", "stylesheet");
		link.setAttribute("href", url);

		document.head.appendChild(link);
		onCleanup(() => document.head.removeChild(link));
	});

	return null;
};
