export type PageContext = {
	pageTitle: string;
	pageKeywords: string[];
	pageDescription: string;
	domain: string;
	extra: Record<string, string>;
};

export interface TextContext {
	content: string;
	before: string;
	after: string;
}

export type Operation = {
	textContext: TextContext;
	pageContext?: PageContext;
} & (
	| {
			type: "translate" | "explain";
	  }
	| {
			// User defined custom operation
			type: "custom";
			id: string;
	  }
);
