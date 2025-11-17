/** biome-ignore-all lint/suspicious/noExplicitAny: any type can be returned */
import type { RpcService } from "./rpc/factory";

export interface CoreService extends RpcService {
	ping(): Promise<string>;
}

export interface TranslateService extends RpcService {
	unary(
		text: string | string[],
		ctx: Record<string, any>,
		options: TranslateOptions,
	): Promise<any>;
	stream(
		text: string,
		ctx: Record<string, any>,
		options: TranslateOptions,
	): AsyncGenerator<any, void, unknown>;
	clearCache(): Promise<void>;
}

export interface TranslateOptions {
	modelId: string;
	promptId: string;
	cleanCache?: boolean;
	srcLang: string;
	dstLang: string;
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
