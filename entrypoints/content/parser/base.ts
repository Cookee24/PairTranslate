import type {
	ChainedGeneratorFn,
	ElementGenerator,
	InitialGeneratorFn,
	Options,
	State,
} from "./types";

// Indicate if a element is excluded
export async function* textWalker(state: State): ElementGenerator {
	// Cache
	const excludedElements = new WeakSet<HTMLElement>();

	const createTreeWalker = (element: Node) => {
		return document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
	};

	const hasMeaningfulText = (node: Node) => {
		return hasMeaningfulChars(node.textContent);
	};

	const judge = (el: HTMLElement) => {
		if (!el.matches(state.textSelector)) {
			return false;
		} else if (
			(el.parentElement && excludedElements.has(el.parentElement)) ||
			el.closest(state.excludedSelector)
		) {
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
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		if (!hasMeaningfulText(node)) continue;
		const parent = node.parentElement;
		if (parent && judge(parent)) yield parent;
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
		for (const mutation of mutations) {
			for (const node of mutation.addedNodes) {
				if (node.nodeType === Node.ELEMENT_NODE) {
					const el = node as HTMLElement;
					if (el.getAttribute(ELEMENT_CONTAINER) !== null) continue;
					const walker = createTreeWalker(node);
					for (let node = walker.nextNode(); node; node = walker.nextNode()) {
						if (!hasMeaningfulText(node)) continue;
						const parent = node.parentElement;
						if (parent && judge(parent)) elementSet.add(new WeakRef(parent));
					}
				}
			}
		}
		if (elementSet.size > 0) notifier.notify();
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

// Filter out child elements of already yielded elements
// e.g. for <p>text <b>bold</b> text</p>, only return <p>
export async function* childFilter(
	state: State,
	prev: ElementGenerator,
): ElementGenerator {
	var parentStore = new WeakSet<HTMLElement>();

	const climb = (el: HTMLElement) => {
		// At most climb 8 levels to avoid deep traversal
		for (let i = 0; i < 8 && el !== state.root && el.parentElement; i++) {
			if (parentStore.has(el.parentElement)) {
				return false;
			}
			el = el.parentElement;
		}
		return true;
	};

	for await (const element of prev) {
		// TreeWalker goes through nodes in depth first order,
		// so the parent is guaranteed to be processed before the child.
		// You do can insert elements between the parent and child while
		// the gap of walking the DOM tree, but this situation is quite rare.
		// We assume this kind of operation does not exist.
		if (climb(element)) {
			parentStore.add(element);
			yield element;
		}
	}
}

export async function* emittedFilter(
	_state: State,
	prev: ElementGenerator,
): ElementGenerator {
	var emittedElements = new WeakSet<HTMLElement>();

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
		const text = element.textContent?.trim() || "";

		// Skip if text is too short or empty
		if (text.length < 2 || !hasMeaningfulChars(text)) {
			continue;
		}

		// Skip common untranslatable patterns
		if (
			// Email addresses
			/^[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(text) ||
			// Social media handles (@username)
			/^@\w+$/.test(text) ||
			// URLs and domains
			/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)\/?$/.test(text) ||
			// Version numbers
			/^v?\d+\.\d+(\.\d+)?(-\w+)?$/.test(text) ||
			// Currency symbols only
			/^[$€£¥₹₽¢]+$/.test(text) ||
			// Time formats
			/^\d{1,2}:\d{2}(:\d{2})?(\s?(AM|PM))?$/i.test(text) ||
			// Dates (basic patterns)
			/^\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}$/.test(text) ||
			// Repeated characters (like "...")
			/^(.)\1{2,}$/.test(text)
		) {
			continue;
		}

		let flag = false;
		for (const regex of state.extraTextFilters) {
			if (regex.test(text)) {
				flag = true;
				break;
			}
		}
		if (flag) continue;

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
		childFilter,
		emittedFilter,
		textContentFilter,
	];
	const appendGenerators = options.appendGenerators || [];

	return pipe(state, textWalker, ...defaultGenerators, ...appendGenerators);
}
