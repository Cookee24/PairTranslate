import { listenEnabled } from "~/utils/settings/helper";
import App from "./App";
import "~/utils/rpc/wxt-def";
import { mountOverlay } from "./overlay";

export default defineContentScript({
	matches: ["<all_urls>"],
	main: () =>
		requestIdleCallback(
			async () => {
				let dispose = () => {};
				listenEnabled((enabled) => {
					if (enabled) {
						waitRpc().then(() => {
							dispose = mountOverlay(App);
						});
					} else {
						dispose();
					}
				});
			},
			{ timeout: 2000 },
		),
});
