import { browserTranslate } from "./translate/browser";
import { deepLTranslate } from "./translate/deepl";
import { deeplxTranslate } from "./translate/deeplx";
import { googleTranslate } from "./translate/google";
import { microsoftTranslate } from "./translate/microsoft";
import type {
	TranslationConfig,
	TranslationParams,
	TranslationResult,
	TranslationService,
} from "./translate/types";

export const translate = async (
	service: TranslationService,
	config: TranslationConfig,
	params: TranslationParams,
): Promise<TranslationResult> => {
	switch (service) {
		case "google":
			return googleTranslate(config, params);
		case "microsoft":
			return microsoftTranslate(config, params);
		case "deepl":
			return deepLTranslate(config, params);
		case "deeplx":
			return deeplxTranslate(config, params);
		case "browser":
			return browserTranslate(config, params);
		default:
			throw new Error(`Unknown translation service: ${service}`);
	}
};

export { browserTranslate } from "./translate/browser";
export { deepLTranslate } from "./translate/deepl";
export { deeplxTranslate } from "./translate/deeplx";
export { googleTranslate } from "./translate/google";
export { microsoftTranslate } from "./translate/microsoft";
export * from "./translate/types";
