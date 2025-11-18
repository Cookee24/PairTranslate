export interface PageContext extends Record<string, string> {
	title: string;
	domain: string;
}

export interface TextContext {
	text: string;
	surr?: {
		before?: string;
		after?: string;
	};
}

export interface TranslateContext extends Record<string, unknown> {
	page?: PageContext;
	surr?: {
		before?: string;
		after?: string;
	};
}
