import type { RpcService } from "./rpc/factory";
import type { PageContext, TextContext } from "./types";

export interface CoreService extends RpcService {
	ping(): Promise<string>;
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

export interface MatchService extends RpcService {
	matchParser(domain: string): Promise<number | null>;
	matchWebsiteRule(domain: string): Promise<number | null>;
}

export interface AllServices
	extends CoreService,
		TranslateService,
		StyleService,
		MatchService {}

export * from "./rpc/core";
export * from "./rpc/factory";
export * from "./rpc/logger";
export * from "./rpc/wxt";
export * from "./rpc/wxt-def";
