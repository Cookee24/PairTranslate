import { setRpc } from "./rpc";

export default defineBackground(() => {
	console.log("Pair Translate background script loaded", {
		id: browser.runtime.id,
	});

	setRpc();
});
