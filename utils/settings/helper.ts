import type * as s from "./def";
import { generateDefaultSettings } from "./default";
import { migrateSettings } from "./migration";

export function listenEnabled(callback: (enabled: boolean) => void) {
	browser.storage.local.get([STORAGE_KEYS.settings], (res) => {
		const settings = res[STORAGE_KEYS.settings];
		const enabled = settings?.basic?.enabled ?? false;
		callback(enabled);
	});

	const listener = (
		changes: {
			[key: string]: Browser.storage.StorageChange;
		},
		area: Browser.storage.AreaName,
	) => {
		if (area !== "local") return;
		const settings = changes[STORAGE_KEYS.settings];
		if (settings) {
			callback(settings.newValue?.basic?.enabled ?? false);
		}
	};

	browser.storage.onChanged.addListener(listener);
	return () => browser.storage.onChanged.removeListener(listener);
}

export function listenSettings(callback: (settings: s.SettingsSchema) => void) {
	browser.storage.local.get([STORAGE_KEYS.settings], (res) => {
		const settings = res[STORAGE_KEYS.settings];
		callback(settings);
	});

	const listener = (
		changes: {
			[key: string]: Browser.storage.StorageChange;
		},
		area: Browser.storage.AreaName,
	) => {
		if (area !== "local") return;
		const settings = changes[STORAGE_KEYS.settings];
		if (settings) {
			callback(settings.newValue);
		}
	};

	browser.storage.onChanged.addListener(listener);
	return () => browser.storage.onChanged.removeListener(listener);
}

export function saveSettings(settings: s.SettingsSchema): Promise<void> {
	return browser.storage.local.set({
		[STORAGE_KEYS.settings]: settings,
	});
}

export async function getSettings(): Promise<s.SettingsSchema> {
	const res = await browser.storage.local.get([STORAGE_KEYS.settings]);
	return res[STORAGE_KEYS.settings];
}

export async function initializeSettings(): Promise<void> {
	const res = await browser.storage.local.get([STORAGE_KEYS.settings]);
	if (!res[STORAGE_KEYS.settings]) {
		const defaultSettings = generateDefaultSettings();
		await browser.storage.local.set({
			[STORAGE_KEYS.settings]: defaultSettings,
		});
	} else {
		const final = migrateSettings(res[STORAGE_KEYS.settings]);
		await browser.storage.local.set({
			[STORAGE_KEYS.settings]: final,
		});
	}
}
