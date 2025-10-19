export default () => {
	const style = document.createElement("style");
	style.textContent = `
	[${ELEMENT_CONTAINER}] {
		display: contents; 
	} 
	[${UNSET_CLAMP_STYLE}] { 
		-webkit-line-clamp: unset !important; 
		max-height: unset !important; 
	}`;
	document.head.appendChild(style);
	onCleanup(() => document.head.removeChild(style));

	return null;
};
