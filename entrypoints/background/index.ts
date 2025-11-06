import { initializeSettings } from "~/utils/settings/helper";
import { setRpc } from "./rpc";

export default defineBackground(async () => {
	console.log("Pair Translate background script loaded", {
		id: browser.runtime.id,
	});

	await initializeSettings();
	setRpc();
});
