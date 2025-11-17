import type { RpcService } from "./rpc/factory";
import type { PageContext, TextContext } from "./types";

export interface CoreService extends RpcService {
	ping(): Promise<string>;
}

export interface TranslateService extends RpcService {
	unary(
		context: [PageContext | undefined, TextContext],
		options: TranslateOptions,
	): Promise<string>;
	stream(
		context: [PageContext | undefined, TextContext],
		options: TranslateOptions,
	): AsyncGenerator<string, void, unknown>;
	batch(
		context: [PageContext | undefined, string[]],
		options: TranslateOptions,
	): Promise<string[]>;
	clearCache(): Promise<void>;
}

export interface TranslateOptions {
	modelId: string;
	promptId: string; // Indicating the prompt uuid, can be queried in settings
	cleanCache?: boolean;
	sourceLang: string;
	targetLang: string;
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
