export const ContentStyle = () => {
	onMount(() => {
		const style = document.createElement("style");
		style.setAttribute(STYLE_CONTAINER, "");
		style.textContent = `[${ELEMENT_CONTAINER}] {
	display: contents; 
} 
[${ELEMENT_TRANSLATED}] { 
	-webkit-line-clamp: unset !important; 
	max-height: unset !important; 
}`;

		document.head.appendChild(style);
		onCleanup(() => document.head.removeChild(style));
	});

	return null;
};

export const KatexStyle = () => {
	onMount(() => {
		const link = document.createElement("link");
		const url = browser.runtime.getURL("/katex/katex.min.css");
		link.setAttribute(STYLE_CONTAINER, "");
		link.setAttribute("rel", "stylesheet");
		link.setAttribute("href", url);

		document.head.appendChild(link);
		onCleanup(() => document.head.removeChild(link));
	});

	return null;
};
