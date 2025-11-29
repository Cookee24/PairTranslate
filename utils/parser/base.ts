import { hasMeaningfulChars } from "~/utils/blank";
import {
	EXCLUDED_SELECTORS,
	INTERACTIVE_SELECTORS,
	TEXT_SELECTORS,
} from "~/utils/constants";
import { createNotifier } from "~/utils/notify";
import type {
	ChainedGeneratorFn,
	ElementGenerator,
	InitialGeneratorFn,
	Options,
	State,
} from "./types";

// Combine for better performance
const COMMON_SKIP_PATTERNS = new RegExp(
	[
		// Email addresses
		/^[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.source,
		// Social media handles (@username)
		/^@\w+$/.source,
		// URLs and domains
		/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)\/?$/.source,
		// Version numbers
		/^v?\d+\.\d+(\.\d+)?(-\w+)?$/.source,
		// Currency symbols only
		/^[$€£¥₹₽¢]+$/.source,
		// Time formats
		/^\d{1,2}:\d{2}(:\d{2})?(\s?(AM|PM))?$/i.source,
		// Dates (basic patterns)
		/^\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}$/.source,
		// Repeated characters (like "...")
		/^(.)\1{2,}$/.source,
	].join("|"),
	"i",
);

// Check if element has its own text nodes (not inside children)
const hasDirectText = (el: Element): boolean => {
	let node = el.firstChild;
	while (node) {
		if (node.nodeType === Node.TEXT_NODE && /\S/.test(node.nodeValue || "")) {
			return true;
		}
		node = node.nextSibling;
	}
	return false;
};

// Get text content strictly from direct text nodes
const getDirectText = (el: Element): string => {
	let text = "";
	let node = el.firstChild;
	while (node) {
		if (node.nodeType === Node.TEXT_NODE) {
			// Using nodeValue is faster than textContent for text nodes
			text += node.nodeValue;
		}
		node = node.nextSibling;
	}
	return text;
};

const skipSubtree = (walker: TreeWalker): HTMLElement | null => {
	// 1. Try to go to the immediate sibling
	const sibling = walker.nextSibling();
	if (sibling) return sibling as HTMLElement;

	// 2. If no sibling, we are at the end of a branch.
	// We need to climb up until we find an uncle (parent's sibling).
	// Note: We check walker.parentNode() to ensure we don't go past the root.
	let parent = walker.parentNode();
	while (parent) {
		const uncle = walker.nextSibling();
		if (uncle) return uncle as HTMLElement;
		parent = walker.parentNode();
	}

	return null; // Reached end of document
};

export async function* elementWalker(state: State): ElementGenerator {
	const judgeText = (el: HTMLElement): boolean => {
		if (!el.matches(state.textSelector)) return false;
		if (!hasDirectText(el)) return false;
		const text = getDirectText(el);
		if (!hasMeaningfulChars(text)) return false;

		return true;
	};

	const createElementWalker = (element: Node) => {
		return document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, {
			acceptNode: (node) => {
				const el = node as HTMLElement;

				if (el.matches(state.excludedSelector)) {
					return NodeFilter.FILTER_REJECT; // Prune subtree
				}

				for (const fn of state.judgeFns) {
					if (!fn(el)) {
						return NodeFilter.FILTER_REJECT; // Prune subtree
					}
				}

				return NodeFilter.FILTER_ACCEPT;
			},
		});
	};

	const walker = createElementWalker(state.root);
	let node = walker.nextNode();

	while (node) {
		const element = node as HTMLElement;
		if (judgeText(element)) {
			node = skipSubtree(walker);
			yield element;
		} else {
			node = walker.nextNode();
		}
	}

	if (!state.listenNew) return;

	const notifier = createNotifier();
	const mutationsQueue = new Set<WeakRef<HTMLElement>>();

	if (state.signal) {
		if (state.signal.aborted) {
			return;
		} else {
			state.signal.addEventListener("abort", notifier.throw);
		}
	}

	const excludedRoot = new WeakSet<HTMLElement>();
	const handler: MutationCallback = (mutations) => {
		let hasUpdates = false;
		for (const mutation of mutations) {
			for (const node of mutation.addedNodes) {
				if (node.nodeType === Node.ELEMENT_NODE) {
					const el = node as HTMLElement;

					// Skip if matches excluded selectors
					const parent = el.parentElement;
					if (parent && excludedRoot.has(parent)) {
						excludedRoot.add(el);
						continue;
					}

					const excludedAncestor = el.closest(state.excludedSelector);
					if (excludedAncestor) {
						excludedRoot.add(el);
						parent && excludedRoot.add(parent);
						excludedRoot.add(excludedAncestor as HTMLElement);
						continue;
					}

					if (state.judgeFns.some((fn) => !fn(el))) {
						excludedRoot.add(el);
						continue;
					}

					if (judgeText(el)) {
						mutationsQueue.add(new WeakRef(el));
						hasUpdates = true;
					}

					const walker = createElementWalker(el);
					let cur = walker.nextNode();
					while (cur) {
						const childEl = cur as HTMLElement;
						if (judgeText(childEl)) {
							mutationsQueue.add(new WeakRef(childEl));
							hasUpdates = true;
							cur = skipSubtree(walker);
						} else {
							cur = walker.nextNode();
						}
					}
				}
			}
		}
		if (hasUpdates) notifier.notify();
	};

	const observerCallback: MutationCallback = (mutations, obs) => {
		for (const fn of state.mutationObserverCallbacks) {
			if (fn !== handler) fn(mutations, obs);
		}
		handler(mutations, obs);
	};

	const observer = new MutationObserver(observerCallback);
	state.mutationObserverCallbacks.add(handler);

	observer.observe(state.root, {
		childList: true,
		subtree: true,
		attributes: false,
		characterData: false,
	});

	try {
		while (true) {
			await notifier.wait();
			for (const ref of mutationsQueue) {
				const element = ref.deref();
				if (element) yield element;
			}
			mutationsQueue.clear();
		}
	} catch {
		// Only triggered on abort
		state.signal?.removeEventListener("abort", notifier.throw);
	} finally {
		state.mutationObserverCallbacks.delete(handler);
		observer.disconnect();
	}
}

// Prevents processing the exact same DOM element reference multiple times.
// Useful if MutationObserver triggers multiple times for the same node.
export async function* emittedFilter(
	_state: State,
	prev: ElementGenerator,
): ElementGenerator {
	const emittedElements = new WeakSet<HTMLElement>();
	for await (const element of prev) {
		if (!emittedElements.has(element)) {
			emittedElements.add(element);
			yield element;
		}
	}
}

export async function* textContentFilter(
	state: State,
	prev: ElementGenerator,
): ElementGenerator {
	for await (const element of prev) {
		const text = getDirectText(element);
		const trimmed = text.trim();

		if (COMMON_SKIP_PATTERNS.test(trimmed)) continue;

		let isInvalid = false;
		for (const regex of state.extraTextFilters) {
			if (regex.test(trimmed)) {
				isInvalid = true;
				break;
			}
		}
		if (isInvalid) continue;

		yield element;
	}
}

export function pipe(
	state: State,
	fn: InitialGeneratorFn,
	...fns: ChainedGeneratorFn[]
): ElementGenerator {
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
		textSelector: [...(options.textSelectors || []), ...TEXT_SELECTORS].join(
			", ",
		),
		judgeFns: options.judgeFns || [],
		listenNew: options.listenNew || true,
		mutationObserverCallbacks: new Set<MutationCallback>(),
		extraTextFilters: options.extraTextFilters || [],
	};
}

export function domListener(options: Options = {}): ElementGenerator {
	const state = getState(options);

	const defaultGenerators: ChainedGeneratorFn[] = [
		emittedFilter, // Keeps distinct object references unique
		textContentFilter, // Filters noise (dates, emails, etc)
	];
	const appendGenerators = options.appendGenerators || [];

	// childFilter is removed from pipeline
	return pipe(state, elementWalker, ...defaultGenerators, ...appendGenerators);
}
