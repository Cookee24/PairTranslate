export default () => {
	const style = document.createElement("style");
	style.textContent = `
	[${ELEMENT_CONTAINER}] {
		display: contents; 
	} 
	[${ELEMENT_TRANSLATED}] { 
		-webkit-line-clamp: unset !important; 
		max-height: unset !important; 
	}
	`;

	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.25/dist/katex.min.css";
	link.integrity =
		"sha384-WcoG4HRXMzYzfCgiyfrySxx90XSl2rxY5mnVY5TwtWE6KLrArNKn0T/mOgNL0Mmi";
	link.crossOrigin = "anonymous";

	document.head.appendChild(style);
	document.head.appendChild(link);

	onCleanup(() => {
		document.head.removeChild(style);
		document.head.removeChild(link);
	});

	return null;
};
