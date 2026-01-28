import type { ServicesSettings } from "./def";
import { SETTINGS_VERSION, SettingsSchema } from "./def";
import {
	generateDebugSettings,
	generatePromptSettings,
	generateQueueControlSettings,
	generateTranslateSettings,
} from "./default";

type LegacyLLMService = {
	name: string;
	baseUrl: string;
	apiSpec: "openai" | "anthropic" | "google";
	apiKey?: string;
	model: string;
	temperature?: number;
	maxOutputTokens?: number;
};

type LegacyTraditionalService = {
	name: string;
	baseUrl?: string;
	apiSpec: "microsoft" | "google" | "deepl" | "deeplx" | "browser";
	apiKey?: string;
	region?: string;
};

type LegacyServices = {
	llmServices?: Record<string, LegacyLLMService>;
	traditionalServices?: Record<string, LegacyTraditionalService>;
};

type LegacyTranslateSettings = {
	sourceLang: string;
	targetLang: string;
	filterInteractive: boolean;
	concurrentRequests: number;
	maxBatchSize: number;
	cacheSize: number;
	translationMode: "parallel" | "replace";
	inTextTranslateIconEnabled?: boolean;
	translateFullPage: boolean;
	inTextTranslateModel?: string;
	floatingTranslateModel?: string;
	floatingExplainModel?: string;
	inputTranslateModel?: string;
	inputTranslateLang: string;
};

type SettingsV1 = Omit<SettingsSchema, "debug"> & { __v: 1 };

type LegacySettingsV0 = Omit<SettingsV1, "services" | "prompts"> & {
	services?: LegacyServices;
	prompts?: SettingsSchema["prompts"];
	translate?: LegacyTranslateSettings;
	__v?: number;
};

export const migrateSettings = (raw: unknown): SettingsSchema => {
	if (!raw || typeof raw !== "object") {
		throw new Error("Cannot migrate invalid settings payload");
	}

	let working: unknown = raw;
	let version = getSettingsVersion(raw);

	while (version < SETTINGS_VERSION) {
		if (version === 0) {
			working = migrateV0ToV1(working as LegacySettingsV0);
			version = 1;
			continue;
		}
		if (version === 1) {
			working = migrateV1ToV2(working as SettingsV1);
			version = 2;
			continue;
		}
		if (version === 2) {
			working = migrateV2ToV3(working as SettingsSchema);
			version = 3;
			continue;
		}
		throw new Error(`Unsupported settings version: ${version}`);
	}

	const parsed = SettingsSchema.safeParse(working);
	if (!parsed.success) {
		throw new Error(
			`Invalid settings after migration: ${parsed.error.message}`,
		);
	}
	return parsed.data;
};

function migrateV0ToV1(oldSettings: LegacySettingsV0): SettingsV1 {
	const services = convertLegacyServices(oldSettings.services);
	const translate = getModernTranslateSettings(oldSettings.translate);
	const queue = buildQueueSettings(oldSettings.translate);
	return {
		basic: oldSettings.basic,
		translate: translate,
		websiteRules: oldSettings.websiteRules ?? [],
		queue,
		services,
		prompts: oldSettings.prompts ?? generatePromptSettings(),
		__v: 1,
	};
}

function migrateV1ToV2(oldSettings: SettingsV1): SettingsSchema {
	return {
		...oldSettings,
		debug: generateDebugSettings(),
		__v: 2,
	};
}

function migrateV2ToV3(oldSettings: SettingsSchema): SettingsSchema {
	// For v3 we reset prompts to the new defaults. Keep other settings as-is.
	return {
		...oldSettings,
		prompts: generatePromptSettings(),
		__v: 3,
	};
}

function convertLegacyServices(legacy?: LegacyServices): ServicesSettings {
	const next: ServicesSettings = {};
	const llmEntries = legacy?.llmServices ?? {};
	Object.entries(llmEntries).forEach(([id, service]) => {
		next[id] = {
			type: "llm",
			name: service.name,
			baseUrl: service.baseUrl,
			apiSpec: service.apiSpec,
			apiKey: service.apiKey,
			model: service.model,
			temperature: service.temperature,
			maxOutputTokens: service.maxOutputTokens,
		};
	});

	const traditionalEntries = legacy?.traditionalServices ?? {};
	Object.entries(traditionalEntries).forEach(([id, service]) => {
		next[id] = {
			type: "traditional",
			name: service.name,
			baseUrl: service.baseUrl,
			apiSpec: service.apiSpec,
			apiKey: service.apiKey,
			region: service.region,
		};
	});

	return next;
}

function getModernTranslateSettings(
	legacy?: LegacyTranslateSettings,
): SettingsSchema["translate"] {
	if (!legacy) {
		return generateTranslateSettings();
	}

	const defaults = generateTranslateSettings();
	const { concurrentRequests, maxBatchSize, cacheSize, ...rest } = legacy;
	void concurrentRequests;
	void maxBatchSize;
	void cacheSize;
	return {
		...defaults,
		...rest,
	};
}

function buildQueueSettings(
	legacy?: LegacyTranslateSettings,
): SettingsSchema["queue"] {
	const defaults = generateQueueControlSettings();

	return {
		requestConcurrency:
			legacy?.concurrentRequests ?? defaults.requestConcurrency,
		tokensPerMinute: defaults.tokensPerMinute,
		maxBatchSize: legacy?.maxBatchSize ?? defaults.maxBatchSize,
		maxTokensPerBatch: defaults.maxTokensPerBatch,
		cacheSize: legacy?.cacheSize ?? defaults.cacheSize,
	};
}

function getSettingsVersion(raw: unknown): number {
	if (raw && typeof raw === "object" && "__v" in raw) {
		const candidate = (raw as { __v?: unknown }).__v;
		if (typeof candidate === "number") {
			return candidate;
		}
	}
	return 0;
}
