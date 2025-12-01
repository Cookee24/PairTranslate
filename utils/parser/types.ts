export interface State {
	root: Element;
	signal?: AbortSignal;
	excludedSelector: string;
	textSelector: string;
	listenNew: boolean;
	judgeFn?: JudgeFn;
	extraTextFilter?: RegExp;
}

export interface Options {
	root?: Element;
	signal?: AbortSignal;
	excludedSelectors?: string[];
	textSelectors?: string[];
	listenNew?: boolean;
	extraTextFilters?: RegExp[];
	judgeFn?: JudgeFn;
	appendGenerators?: ChainedGeneratorFn[];
	filterInteractive?: boolean;
}

export type JudgeFn = (element: Element) => boolean;

export type DOMSection = Node | [start: Node, end: Node];
export type SectionGenerator = AsyncGenerator<DOMSection, void, unknown>;
export type InitialGeneratorFn = (state: State) => SectionGenerator;
export type ChainedGeneratorFn = (
	state: State,
	prev: SectionGenerator,
) => SectionGenerator;
export type DomListener = (options?: Options) => SectionGenerator;

export type WebsiteParser = {
	urlPatterns: string[];
	domListener: DomListener;
};
