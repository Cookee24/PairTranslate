import type z from "zod";
import type { RpcService } from "./rpc/factory";
import type { SettingsSchema } from "./settings";
import type { PageContext, TextContext } from "./types";

export interface CoreService extends RpcService {
	ping(): Promise<string>;
}

export interface SettingsService extends RpcService {
	// Only return `settings.basic.enabled` for quick access.
	isEnabled(): Promise<boolean>;
	streamSettings(): AsyncGenerator<
		z.infer<typeof SettingsSchema>,
		void,
		unknown
	>;
	setSettings(settings: z.infer<typeof SettingsSchema>): Promise<void>;
	resetSettings(): Promise<void>;
}

export interface TranslateService extends RpcService {
	translate(
		modelId: string,
		textContext: TextContext,
		pageContext?: PageContext,
		options?: TranslateOptions,
	): Promise<string>;
	streamTranslate(
		modelId: string,
		textContext: TextContext,
		pageContext?: PageContext,
		options?: TranslateOptions,
	): AsyncGenerator<string, void, unknown>;
	explain(
		modelId: string,
		textContext: TextContext,
		pageContext?: PageContext,
		options?: TranslateOptions,
	): Promise<string>;
	streamExplain(
		modelId: string,
		textContext: TextContext,
		pageContext?: PageContext,
		options?: TranslateOptions,
	): AsyncGenerator<string, void, unknown>;
	batchTranslate(
		modelId: string,
		texts: string[],
		pageContext?: PageContext,
		options?: TranslateOptions,
	): Promise<string[]>;
	streamInputTranslate(
		modelId: string,
		text: string,
		pageContext?: PageContext,
		targetLang?: string,
	): AsyncGenerator<string, void, unknown>;
	clearCache(): Promise<void>;
}

export interface TranslateOptions {
	cleanCache?: boolean;
}

export interface StyleService extends RpcService {
	getContentStyles(): Promise<[documentCss: string, shadowCss: string]>;
}

export interface AllServices
	extends CoreService,
		SettingsService,
		TranslateService,
		StyleService {}

export * from "./rpc/core";
export * from "./rpc/factory";
export * from "./rpc/logger";
export * from "./rpc/wxt";
export * from "./rpc/wxt-def";
