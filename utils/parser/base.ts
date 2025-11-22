import { hasMeaningfulChars } from "~/utils/blank";
import {
	ELEMENT_CONTAINER,
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

const createTreeWalker = (element: Node) => {
	return document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
};

const hasDirectText = (el?: Element | null) => {
	if (!el) return false;
	let node = el.firstChild;
	while (node) {
		const text = node.nodeValue;
		if (node.nodeType === Node.TEXT_NODE && text && /\S/.test(text))
			return true;
		node = node.nextSibling;
	}
	return false;
};

export async function* textWalker(state: State): ElementGenerator {
	// Cache for elements confirmed to be excluded to avoid expensive .closest() calls
	const excludedElements = new WeakSet<HTMLElement>();

	const judge = (el: HTMLElement) => {
		if (!el.matches(state.textSelector)) return false;

		const parent = el.parentElement;
		if (parent && excludedElements.has(parent)) {
			excludedElements.add(el);
			return false;
		}

		if (el.closest(state.excludedSelector)) {
			excludedElements.add(el);
			return false;
		}

		for (const fn of state.judgeFns) {
			if (!fn(el)) {
				excludedElements.add(el);
				return false;
			}
		}

		return true;
	};

	const walker = createTreeWalker(state.root);

	let node = walker.nextNode();
	while (node) {
		if (!hasMeaningfulChars(node.nodeValue)) {
			node = walker.nextNode();
			continue;
		}

		const element = node.parentElement;
		if (element) {
			const parent = element.parentElement;
			if (parent && parent.firstChild === element && hasDirectText(parent)) {
				// Skip this element, the parent container will be picked up by the walker later
				node = walker.nextNode();
				continue;
			}

			if (judge(element)) {
				yield element;
			}
		}
		node = walker.nextNode();
	}

	if (!state.listenNew) return;

	const elementSet = new Set<WeakRef<HTMLElement>>();
	const notifier = createNotifier();

	const observer = new MutationObserver((mutations) => {
		for (const fn of state.mutationObserverCallbacks) {
			fn(mutations, observer);
		}
	});

	const handler: MutationCallback = (mutations) => {
		let hasUpdates = false;
		for (const mutation of mutations) {
			for (const node of mutation.addedNodes) {
				if (node.nodeType === Node.ELEMENT_NODE) {
					const el = node as HTMLElement;
					if (el.getAttribute(ELEMENT_CONTAINER) !== null) continue;

					const walker = createTreeWalker(node);
					for (let node = walker.nextNode(); node; node = walker.nextNode()) {
						if (!hasMeaningfulChars(node.nodeValue)) continue;
						const parent = node.parentElement;
						if (parent && judge(parent)) {
							elementSet.add(new WeakRef(parent));
							hasUpdates = true;
						}
					}
				}
			}
		}
		if (hasUpdates) notifier.notify();
	};
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
			for (const node of elementSet) {
				const element = node.deref();
				if (element) yield element;
			}
			elementSet.clear();
		}
	} finally {
		state.mutationObserverCallbacks.delete(handler);
		observer.disconnect();
	}
}

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
		// If element has no Element children, getting nodeValue of firstChild is
		// much faster than .textContent (which causes serialization of the tree).
		let text: string;
		if (element.firstElementChild === null && element.firstChild) {
			text = element.firstChild.nodeValue || "";
		} else {
			text = element.textContent || "";
		}

		const trimmed = text.trim();
		if (COMMON_SKIP_PATTERNS.test(trimmed)) {
			continue;
		}

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

export async function* childFilter(
	state: State,
	prev: ElementGenerator,
): ElementGenerator {
	const parentStore = new WeakSet<HTMLElement>();

	const MAX_DEPTH = 8;

	const climb = (el: HTMLElement) => {
		let current: HTMLElement | null = el;
		let depth = 0;
		while (depth < MAX_DEPTH && current && current !== state.root) {
			const parent: HTMLElement | null = current.parentElement;
			if (parent && parentStore.has(parent)) {
				return false;
			}
			current = parent;
			depth++;
		}
		return true;
	};

	for await (const element of prev) {
		if (climb(element)) {
			parentStore.add(element);
			yield element;
		}
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
		emittedFilter,
		textContentFilter,
		childFilter,
	];
	const appendGenerators = options.appendGenerators || [];

	return pipe(state, textWalker, ...defaultGenerators, ...appendGenerators);
}
