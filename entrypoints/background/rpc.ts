import { createSettingsService } from "./services/settings";
import { createTranslateService } from "./services/translate";
import { settingsStore } from "./utils/settings";

export const setRpc = async () => {
	// Initialize the settings store
	await settingsStore.initialize();

	const settingsService = createSettingsService();
	const translateService = createTranslateService();

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
		clearCache: translateService.clearCache,
	};

	setupWxtServer(clientImpl, WXT_TRANSPORTATION_NAME);
};
