import { browser } from "#imports";

const TRANSLATOR_POPUP_WIDTH = 420;
const TRANSLATOR_POPUP_HEIGHT = 640;

export const getTranslatorPopupUrl = (): string =>
	browser.runtime.getURL("/translator.html");

export const openTranslatorPopup = async (): Promise<void> => {
	// Firefox for Android has no windows API, so fall back to a tab.
	if (!browser.windows?.create) {
		await browser.tabs.create({ url: getTranslatorPopupUrl() });
		return;
	}
	await browser.windows.create({
		type: "popup",
		url: getTranslatorPopupUrl(),
		width: TRANSLATOR_POPUP_WIDTH,
		height: TRANSLATOR_POPUP_HEIGHT,
	});
};
