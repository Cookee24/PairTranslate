import type z from "zod";
import type { SettingsService } from "~/utils/rpc";
import { generateDefaultSettings } from "~/utils/settings";
import { settingsStore } from "../utils/settings";

export const createSettingsService = (): SettingsService => {
	return {
		isEnabled: async () => {
			const settings = settingsStore.get();
			return settings.basic.enabled;
		},
		/**
		 * A single, unified stream for all settings changes.
		 * Subscribes to the store and yields updates on demand.
		 */
		streamSettings: async function* () {
			let unsubscribe = () => {};
			try {
				// Yield the initial state immediately on connection
				yield settingsStore.get();

				const notifier = createNotifier<z.infer<typeof SettingsSchema>>();

				// Subscribe to store changes. The callback will notify our stream.
				unsubscribe = settingsStore.subscribe((newSettings) => {
					notifier.notify(newSettings);
				});

				// Wait for notifications indefinitely
				while (true) {
					yield await notifier.wait();
				}
			} finally {
				// Crucial: Unsubscribe when the client disconnects to prevent memory leaks
				unsubscribe();
			}
		},

		/**
		 * A simplified method to update settings.
		 */
		setSettings: async (settingsUpdate: z.infer<typeof SettingsSchema>) => {
			try {
				await settingsStore.update(settingsUpdate);
			} catch (error) {
				console.error("Error updating settings:", error);
				throw error; // Re-throw to inform the client
			}
		},

		/**
		 * Reset all settings to default values.
		 */
		resetSettings: async () => {
			try {
				const defaultSettings = generateDefaultSettings();
				await settingsStore.update(defaultSettings);
			} catch (error) {
				console.error("Error resetting settings:", error);
				throw error;
			}
		},
	};
};
