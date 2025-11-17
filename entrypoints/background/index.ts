import { initializeSettings } from "~/utils/settings/helper";
import { setRpc } from "./rpc";

export default defineBackground(() => {
	console.log("Pair Translate background script loaded", {
		id: browser.runtime.id,
	});

	browser.storage.session.setAccessLevel({
		accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
	});
	initializeSettings().then(setRpc);
});
