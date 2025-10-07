export interface State {
	root: Node;
	excludedSelector: string;
	textSelector: string;
	languageFilters: string[];
	mutationObserverCallbacks: Set<MutationCallback>;
	extraTextFilters: RegExp[];
}

export interface Options {
	root?: Node;
	excludedSelectors?: string[];
	textSelectors?: string[];
	targetLanguage?: string;
	extraTextFilters?: RegExp[];
	appendGenerators?: ChainedGeneratorFn[];
	filterInteractive?: boolean;
}

export type ElementGenerator = AsyncGenerator<HTMLElement, void, unknown>;
export type InitialGeneratorFn = (state: State) => ElementGenerator;
export type ChainedGeneratorFn = (
	state: State,
	prev: ElementGenerator,
) => ElementGenerator;
export type DomListener = (options?: Options) => ElementGenerator;

export type WebsiteParser = {
	urlPatterns: string[];
	domListener: DomListener;
};
