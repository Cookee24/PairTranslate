import { browser } from "#imports";

export const untilAlive = () =>
	new Promise<void>((resolve) => {
		browser.runtime.sendMessage("ping", (resp) => {
			if (resp === "pong") {
				resolve();
			}

			return true;
		});
	});
