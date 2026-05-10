import { type Browser, browser } from "#imports";
import { STORAGE_KEYS } from "~/utils/constants";
import type * as s from "./def";

export type SettingsMigrationErrorState = {
	message: string;
	timestamp: number;
};

export function listenEnabled(callback: (enabled: boolean) => void) {
	browser.storage.local.get([STORAGE_KEYS.settings], (res) => {
		const settings = res[STORAGE_KEYS.settings] as s.SettingsSchema | undefined;
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
		const settings = changes[STORAGE_KEYS.settings]?.newValue as
			| s.SettingsSchema
			| undefined;
		if (settings) {
			callback(settings.basic?.enabled ?? false);
		}
	};

	browser.storage.onChanged.addListener(listener);
	return () => browser.storage.onChanged.removeListener(listener);
}

export function listenSettings(callback: (settings: s.SettingsSchema) => void) {
	browser.storage.local.get([STORAGE_KEYS.settings], (res) => {
		const settings = res[STORAGE_KEYS.settings] as s.SettingsSchema;
		callback(settings);
	});

	const listener = (
		changes: {
			[key: string]: Browser.storage.StorageChange;
		},
		area: Browser.storage.AreaName,
	) => {
		if (area !== "local") return;
		const settings = changes[STORAGE_KEYS.settings]?.newValue as
			| s.SettingsSchema
			| undefined;
		if (settings) {
			callback(settings);
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
	return res[STORAGE_KEYS.settings] as s.SettingsSchema;
}

export async function getSettingsMigrationError(): Promise<
	SettingsMigrationErrorState | undefined
> {
	const res = await browser.storage.local.get(
		STORAGE_KEYS.settingsMigrationError,
	);
	return res[STORAGE_KEYS.settingsMigrationError] as
		| SettingsMigrationErrorState
		| undefined;
}

export async function clearSettingsMigrationError(): Promise<void> {
	await browser.storage.local.remove(STORAGE_KEYS.settingsMigrationError);
}
