import { browser } from "#imports";

export const getCurrentDomain = () =>
	browser.tabs
		.query({ active: true, currentWindow: true })
		.then((tabs) => new URL(tabs[0]?.url || "").hostname)
		.catch(() => "");
