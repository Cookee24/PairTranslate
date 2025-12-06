import { createEffect, onCleanup, onMount } from "solid-js";
import { browser } from "#imports";
import { createTranslationStyle } from "@/hooks/translation-style";
import { useSettings } from "~/hooks/settings";
import { useWebsiteRule } from "~/hooks/website-rule";
import {
	DATA_CONTAINER,
	DATA_GRABBING_CONTAINER,
	DATA_HIDE,
	DATA_PREVENT_SCROLL,
	DATA_STYLE,
	DATA_TRANSLATED,
	DATA_TRANSLATION_TEXT,
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
[${DATA_HIDE}] {
	display: none !important;
}`;

		document.head.appendChild(style);
		onCleanup(() => style.remove());
	});

	return null;
};

export const KatexStyle = () => {
	const link = document.createElement("link");
	const url = browser.runtime.getURL("/katex/katex.min.css");
	link.setAttribute(DATA_STYLE, "");
	link.setAttribute("rel", "stylesheet");
	link.setAttribute("href", url);

	onMount(() => {
		document.head.appendChild(link);
		onCleanup(() => link.remove());
	});

	return null;
};

export const TranslationStyle = () => {
	const { settings } = useSettings();
	const websiteRule = useWebsiteRule();
	const style = document.createElement("style");
	style.setAttribute(DATA_STYLE, "");

	const css = createTranslationStyle(
		() => websiteRule.translationStyle || settings.basic.translationStyle,
	);
	createEffect(() => {
		style.textContent = `[${DATA_TRANSLATION_TEXT}] { ${css()} }`;
	});

	onMount(() => {
		document.head.appendChild(style);
		onCleanup(() => style.remove());
	});

	return null;
};
