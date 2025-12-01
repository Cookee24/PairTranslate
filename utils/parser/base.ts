import { hasMeaningfulChars } from "~/utils/blank";
import {
	BLOCK_TAGS,
	DATA_IFRAME,
	EXCLUDED_SELECTORS,
	INTERACTIVE_SELECTORS,
	TEXT_TAGS,
} from "~/utils/constants";
import { createNotifier } from "~/utils/notify";
import type {
	ChainedGeneratorFn,
	DOMSection,
	InitialGeneratorFn,
	Options,
	SectionGenerator,
	State,
} from "./types";

// Combine for better performance
const COMMON_SKIP_PATTERNS = new RegExp(
	[
		// URLs and domains
		/^(?:(?:https?|ftp):\/\/)?(?:[\w-]+\.)+[a-z]{2,}(?::\d{1,5})?(?:\/[^\s]*)?$/
			.source,
		// Repeated characters (like "...")
		/^(.)\1{2,}$/.source,
	].join("|"),
	"i",
);

const NOT_EMPTY_REGEX = /\S/;

// Check if a node is a visible text node
const showTextNode = (node: Node): boolean =>
	node.nodeType === Node.TEXT_NODE &&
	NOT_EMPTY_REGEX.test(node.nodeValue || "");

// Check if element has its own text nodes (not inside children)
const hasDirectText = (el: Element): boolean => {
	let node = el.firstChild;
	while (node) {
		if (showTextNode(node)) {
			return true;
		}

		node = node.nextSibling;
	}
	return false;
};

const skipSubtree = (walker: TreeWalker): Element | null => {
	// 1. Try to go to the immediate sibling
	const sibling = walker.nextSibling();
	if (sibling) return sibling as Element;

	// 2. If no sibling, we are at the end of a branch.
	// We need to climb up until we find an uncle (parent's sibling).
	// Note: We check walker.parentNode() to ensure we don't go past the root.
	let parent = walker.parentNode();
	while (parent) {
		const uncle = walker.nextSibling();
		if (uncle) return uncle as Element;
		parent = walker.parentNode();
	}

	return null; // Reached end of document
};

const getTextFromSection = (section: DOMSection): string => {
	if (section instanceof Node) {
		return section.textContent || "";
	} else {
		let start: Node | null = section[0];
		const end = section[1];
		const texts: string[] = [];

		while (start) {
			if (start === end) {
				texts.push(start.textContent || "");
				break;
			} else {
				texts.push(start.textContent || "");
				start = start.nextSibling;
			}
		}

		return texts.join("");
	}
};

export async function* elementWalker(state: State): SectionGenerator {
	const isExcluded = (el: Element) => {
		if (el.matches(state.excludedSelector)) return true;
		if (state.judgeFn && !state.judgeFn(el as Element)) return true;
		return false;
	};

	const excludedRoot = new WeakSet<Element>();
	const isExcludedPath = (el: Element) => {
		const parent = el.parentElement;
		if (parent && excludedRoot.has(parent)) {
			excludedRoot.add(el);
			return true;
		}

		if (state.judgeFn && !state.judgeFn(el)) {
			excludedRoot.add(el);
			return true;
		}

		const closest = el.closest(state.excludedSelector);
		if (closest) {
			excludedRoot.add(closest);
			parent && excludedRoot.add(parent);
			excludedRoot.add(el);

			return true;
		}

		return false;
	};

	const judgeText = (el: Element): boolean => {
		if (!state.textTags.has(el.tagName)) return false;
		if (!hasDirectText(el)) return false;

		return true;
	};

	const createElementWalker = (element: Node) => {
		return document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, {
			acceptNode: (node) => {
				const el = node as Element;

				if (isExcluded(el)) {
					return NodeFilter.FILTER_REJECT;
				}

				return NodeFilter.FILTER_ACCEPT;
			},
		});
	};

	type GeneratorFunc = () => Generator<DOMSection, void> | undefined;
	const notifier = createNotifier();
	const generatorList: GeneratorFunc[] = [];
	const makeTextGenerator = (el: Element): GeneratorFunc => {
		const weakRef = new WeakRef(el);
		return () => {
			const element = weakRef.deref();
			if (element) return findTextElementsAndSplit(element);
			return undefined;
		};
	};

	const mutationHandler: MutationCallback = (mutations) => {
		for (const mutation of mutations) {
			for (const node of mutation.addedNodes) {
				if (node.nodeType === Node.ELEMENT_NODE) {
					const root = node as Element;
					if (isExcludedPath(root)) continue;

					generatorList.push(makeTextGenerator(root));
				}
			}
		}
		if (generatorList.length > 0) notifier.notify();
	};

	const observers: MutationObserver[] = [];
	const cleaners: (() => void)[] = [];

	const observeElement = (el: Node) => {
		if (!state.listenNew) return;

		const observer = new MutationObserver(mutationHandler);
		observer.observe(el, {
			childList: true,
			subtree: true,
			attributes: false,
			characterData: false,
		});
		observers.push(observer);
	};
	const cleanup = () => {
		for (const observer of observers) {
			observer.disconnect();
		}
		for (const fn of cleaners) {
			fn();
		}
	};

	const processedIframes = new WeakSet<HTMLIFrameElement>();
	// Handle shadow DOM and iframes
	const findTextElementsInSpecialContainer = function* (
		element: Node,
	): Generator<Element> {
		if (element.nodeType !== Node.ELEMENT_NODE) return;
		const el = element as Element;
		const root = el.shadowRoot;

		if (root) {
			yield* findTextElements(root);
			observeElement(root);
		} else if (
			el.tagName === "IFRAME" &&
			el.getAttribute(DATA_IFRAME) === null
		) {
			const iframe = el as HTMLIFrameElement;
			new Promise<Element | undefined>((resolve) => {
				if (iframe.contentDocument) resolve(iframe.contentDocument.body);
				else {
					const handler = () => resolve(iframe.contentDocument?.body);
					iframe.addEventListener("load", handler, { once: true });
					const weakRef = new WeakRef(iframe);
					cleaners.push(() =>
						weakRef.deref()?.removeEventListener("load", handler),
					);
				}
			}).then((doc) => {
				if (doc && !processedIframes.has(iframe)) {
					generatorList.push(makeTextGenerator(doc));
					notifier.notify();

					observeElement(doc);
					processedIframes.add(iframe);
				}
			});
		}
	};

	// Find element with direct text
	const findTextElements = function* (root: Node): Generator<Element> {
		const walker = createElementWalker(root);
		let node = walker.nextNode();

		while (node) {
			const element = node as Element;
			if (judgeText(element)) {
				node = skipSubtree(walker);
				yield element;
			} else {
				node = walker.nextNode();
				yield* findTextElementsInSpecialContainer(element);
			}
		}
	};

	// If element has block-level children, split into multiple paragraphs
	const paragraphSplitter = function* (
		element: Element,
	): Generator<DOMSection> {
		let node = element.firstChild;
		let start: Node | null = null;
		let end: Node | null = null;
		let flag = false;

		while (node) {
			if (node.nodeType === Node.ELEMENT_NODE) {
				if (state.blockTags.has((node as Element).tagName)) {
					flag = true;

					// Yield previous segment
					if (start && end) {
						yield [start, end];
						start = null;
						end = null;
					}

					// Yield block element
					yield* findTextElementsAndSplit(node);
				} else {
					// An inline element
					if (!start) start = node;
					end = node;
				}
			} else if (showTextNode(node)) {
				if (!start) start = node;
				end = node;
			}

			node = node.nextSibling;
		}

		if (flag) {
			// Yield remaining segment
			if (start && end) {
				yield [start, end];
			}
		} else {
			// No block-level children, yield the whole element
			yield element;
		}
	};

	// Find text elements within root, and split into paragraphs
	const findTextElementsAndSplit = function* (
		root: Node,
	): Generator<DOMSection> {
		if (
			root.nodeType === Node.ELEMENT_NODE &&
			!isExcluded(root as Element) &&
			judgeText(root as Element)
		) {
			yield* paragraphSplitter(root as Element);
			return;
		}

		const generator = findTextElements(root);
		for (const element of generator) {
			yield* paragraphSplitter(element);
		}
	};

	yield* findTextElementsAndSplit(state.root);
	observeElement(state.root);

	if (state.signal) {
		if (state.signal.aborted) {
			return;
		} else {
			state.signal.addEventListener("abort", notifier.throw);
		}
	}

	try {
		while (true) {
			await notifier.wait();
			for (const genFunc of generatorList) {
				const gen = genFunc();
				if (gen) yield* gen;
			}
			generatorList.length = 0;
		}
	} catch {
		// Only triggered on abort
	} finally {
		state.signal?.removeEventListener("abort", notifier.throw);
		cleanup();
	}
}

// Prevents processing the exact same DOM element reference multiple times.
// Useful if MutationObserver triggers multiple times for the same node.
export async function* emittedFilter(
	_state: State,
	prev: SectionGenerator,
): SectionGenerator {
	const emittedNodes = new WeakSet<Node>();
	for await (const section of prev) {
		const node = section instanceof Node ? section : section[0];
		if (emittedNodes.has(node)) {
			continue;
		}
		emittedNodes.add(node);

		yield section;
	}
}

export async function* textContentFilter(
	state: State,
	prev: SectionGenerator,
): SectionGenerator {
	for await (const section of prev) {
		const text = getTextFromSection(section).trim();

		if (!hasMeaningfulChars(text)) {
			continue;
		}
		if (COMMON_SKIP_PATTERNS.test(text)) {
			continue;
		}
		if (state.extraTextFilter?.test(text)) {
			continue;
		}

		yield section;
	}
}

export function pipe(
	state: State,
	fn: InitialGeneratorFn,
	...fns: ChainedGeneratorFn[]
): SectionGenerator {
	let stream = fn(state);
	for (const f of fns) {
		stream = f(state, stream);
	}
	return stream;
}

export function getState(options: Options = {}): State {
	return {
		root: options.root || document.body,
		signal: options.signal,
		excludedSelector: [
			...(options.excludedSelectors || []),
			...EXCLUDED_SELECTORS,
			...((options.filterInteractive ?? true) ? INTERACTIVE_SELECTORS : []),
		].join(", "),
		textTags: new Set(
			[...(options.textTags || []), ...TEXT_TAGS].map((s) => s.toUpperCase()),
		),
		blockTags: new Set(
			[...(options.blockTags || []), ...BLOCK_TAGS].map((s) => s.toUpperCase()),
		),
		judgeFn: options.judgeFn,
		listenNew: options.listenNew ?? true,
		extraTextFilter: options.extraTextFilters
			? new RegExp(options.extraTextFilters.map((r) => r.source).join("|"), "i")
			: undefined,
	};
}

export function domListener(options: Options = {}): SectionGenerator {
	const state = getState(options);

	const defaultGenerators: ChainedGeneratorFn[] = [
		emittedFilter, // Keeps distinct object references unique
		textContentFilter, // Filters noise (dates, emails, etc)
	];
	const appendGenerators = options.appendGenerators || [];

	// childFilter is removed from pipeline
	return pipe(state, elementWalker, ...defaultGenerators, ...appendGenerators);
}
