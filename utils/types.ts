export interface PageContext extends Record<string, string> {
	title: string;
	domain: string;
}

export interface TextContext {
	content: string;
	before: string;
	after: string;
}
