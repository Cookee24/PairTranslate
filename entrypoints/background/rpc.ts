import { createSettingsService } from "./services/settings";
import { createStyleService } from "./services/style";
import { createTranslateService } from "./services/translate";
import { settingsStore } from "./utils/settings";

export const setRpc = async () => {
	// Initialize the settings store
	await settingsStore.initialize();

	const settingsService = createSettingsService();
	const translateService = createTranslateService();
	const styleService = createStyleService();

	const clientImpl: Server<AllServices> = {
		ping: async () => "pong",

		isEnabled: settingsService.isEnabled,
		streamSettings: settingsService.streamSettings,
		setSettings: settingsService.setSettings,
		resetSettings: settingsService.resetSettings,

		translate: translateService.translate,
		batchTranslate: translateService.batchTranslate,
		streamTranslate: translateService.streamTranslate,
		explain: translateService.explain,
		streamExplain: translateService.streamExplain,
		streamInputTranslate: translateService.streamInputTranslate,
		clearCache: translateService.clearCache,

		getContentStyles: styleService.getContentStyles,
	};

	setupWxtServer(clientImpl, WXT_TRANSPORTATION_NAME);
};
