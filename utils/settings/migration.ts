import type { ServicesSettings } from "./def";
import { SETTINGS_VERSION, SettingsSchema } from "./def";
import { generatePromptSettings } from "./default";

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
};

type LegacySettingsV0 = Omit<SettingsSchema, "services" | "prompts" | "__v"> & {
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

function migrateV0ToV1(oldSettings: LegacySettingsV0): SettingsSchema {
	const services = convertLegacyServices(oldSettings.services);
	const translate = {
		...oldSettings.translate,
		concurrentRequests: undefined,
		maxBatchSize: undefined,
		cacheSize: undefined,
	};
	return {
		basic: oldSettings.basic,
		translate: translate,
		websiteRules: oldSettings.websiteRules ?? [],
		queue: {
			requestConcurrency: oldSettings.translate?.concurrentRequests,
			tokensPerMinute: 80000,
			maxBatchSize: oldSettings.translate?.maxBatchSize,
			cacheSize: oldSettings.translate?.cacheSize,
		},
		services,
		prompts: oldSettings.prompts ?? generatePromptSettings(),
		__v: 1,
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

function getSettingsVersion(raw: unknown): number {
	if (raw && typeof raw === "object" && "__v" in raw) {
		const candidate = (raw as { __v?: unknown }).__v;
		if (typeof candidate === "number") {
			return candidate;
		}
	}
	return 0;
}
