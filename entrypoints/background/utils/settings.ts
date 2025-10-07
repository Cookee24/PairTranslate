import type { z } from "zod";
import { createKVStore, type Storage } from "~/utils/storage";

type Settings = z.infer<typeof SettingsSchema>;
type Listener = (settings: Settings) => void;

const createSettingsStore = () => {
	let storage: Storage<Settings> | null = null;
	const listeners = new Set<Listener>();
	let settings: Settings | null = null;
	let isInitialized = false;

	const initialize = async () => {
		if (isInitialized) {
			return;
		}

		storage = createKVStore("pair-translate", STORAGE_KEYS.settings);
		await storage.open();

		const existingSettings = await storage.get("1");

		if (!existingSettings) {
			const defaultSettings = generateDefaultSettings();
			await storage.set("1", defaultSettings);
			settings = defaultSettings;
		} else {
			settings = mergeWithDefaults(existingSettings);
		}

		isInitialized = true;
	};

	const get = () => {
		if (!settings) {
			throw new Error(
				"SettingsStore not initialized. Call initialize() first.",
			);
		}
		return settings;
	};

	const update = async (newSettings: Settings) => {
		if (!storage || !settings) {
			throw new Error("SettingsStore not initialized.");
		}

		await storage.set("1", newSettings);
		settings = newSettings;
		notifyListeners();

		return newSettings;
	};

	const subscribe = (listener: Listener) => {
		listeners.add(listener);

		// Return an unsubscribe function
		return () => listeners.delete(listener);
	};

	const notifyListeners = () => {
		if (!settings) return;

		for (const listener of listeners) {
			listener(settings);
		}
	};

	return {
		initialize,
		get,
		update,
		subscribe,
	};
};

// Export a singleton instance of the store
export const settingsStore = createSettingsStore();
