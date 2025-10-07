import App from "./App";
import { mountOverlay } from "./overlay";
import "~/utils/rpc/wxt-def";

export default defineContentScript({
	matches: ["<all_urls>"],
	main: () =>
		setTimeout(
			() =>
				requestIdleCallback(
					async () => {
						await rpcReady();
						const enabled = await window.rpc.isEnabled();
						if (!enabled) return;

						await mountOverlay(App);
					},
					{ timeout: 2000 },
				),
			500,
		),
});
