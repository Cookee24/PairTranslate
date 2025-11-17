import type { SettingsSchema } from "./def";

export const migrateSettings = (old: SettingsSchema): SettingsSchema => {
	switch (old.__v) {
		case 0: {
			const newSettings: SettingsSchema = {
				...old,
				prompts: generatePromptSettings(),
				__v: 1,
			};
			return migrateSettings(newSettings);
		}
		default:
			return old; // No migration needed
	}
};
