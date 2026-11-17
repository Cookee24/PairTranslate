import { browser } from "#imports";
import { isAndroid } from "./isandroid";

export const openOptionsPage = async (): Promise<void> => {
	// Firefox for Android shows the popup as a full-screen sheet, and
	// runtime.openOptionsPage() opens nothing visible from there.
	if (isAndroid()) {
		await browser.tabs.create({ url: browser.runtime.getURL("/options.html") });
		window.close();
		return;
	}
	await browser.runtime.openOptionsPage();
};
