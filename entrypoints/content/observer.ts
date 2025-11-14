let callbacks = new WeakMap<
	HTMLElement,
	(intersectOrRemove: boolean) => void
>();
let intersectionObserver: IntersectionObserver;
let mutationObserver: MutationObserver;

const init = () => {
	if (!intersectionObserver) {
		intersectionObserver = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					const element = entry.target as HTMLElement;
					triggerListener(element, true);
				}
			});
		});
	}

	if (!mutationObserver) {
		mutationObserver = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				mutation.removedNodes.forEach((removedNode) => {
					if (removedNode.nodeType === Node.ELEMENT_NODE) {
						if (removedNode instanceof HTMLElement) {
							triggerListener(removedNode, false);
						}
					}
				});
			});
		});

		mutationObserver.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}
};

export const listenIntersectionOrRemove = (
	element: HTMLElement,
	callback: (intersectOrRemove: boolean) => void,
) => {
	init();
	if (callbacks.has(element)) return;
	callbacks.set(element, callback);
	intersectionObserver.observe(element);
};

export const listenRemove = (element: HTMLElement, callback: () => void) => {
	init();
	if (callbacks.has(element)) return;
	callbacks.set(element, callback);
};

const triggerListener = (element: HTMLElement, intersectOrRemove: boolean) => {
	const callback = callbacks.get(element);
	if (!callback) return;
	callback(intersectOrRemove);
	if (intersectOrRemove) {
		intersectionObserver.unobserve(element);
	} else {
		intersectionObserver.unobserve(element);
		callbacks.delete(element);
	}
};

export const destroyObservers = () => {
	if (intersectionObserver) {
		intersectionObserver.disconnect();
	}
	if (mutationObserver) {
		mutationObserver.disconnect();
	}
	callbacks = new WeakMap();
};
