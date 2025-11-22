import { defineContentScript } from "#imports";
import { waitRpc } from "~/utils/rpc/wxt-def";
import { listenEnabled } from "~/utils/settings/helper";
import App from "./App";
import "~/utils/rpc/wxt-def";
import { untilAlive } from "~/utils/alive";
import { mountOverlay } from "./overlay";

export default defineContentScript({
	matches: ["<all_urls>"],
	main: () =>
		untilAlive().then(() =>
			requestIdleCallback(
				async () => {
					let last = false;
					let dispose = () => {};
					listenEnabled((enabled) => {
						if (last === enabled) return;
						if (enabled) {
							waitRpc().then(() => {
								dispose = mountOverlay(App);
							});
						} else {
							dispose();
						}
						last = enabled;
					});
				},
				{ timeout: 500 },
			),
		),
});
