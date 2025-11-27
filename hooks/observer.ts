import { onCleanup } from "solid-js";

export function createElementObserver() {
	let callbacks = new WeakMap<
		HTMLElement,
		(intersectOrRemove: boolean) => void
	>();
	const intersectionObserver = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			if (entry.isIntersecting) {
				const element = entry.target as HTMLElement;
				triggerListener(element, true);
			}
		}
	});
	const mutationObserver = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			for (const removedNode of mutation.removedNodes) {
				if (removedNode.nodeType === Node.ELEMENT_NODE) {
					if (removedNode instanceof HTMLElement) {
						triggerListener(removedNode, false);
					}
				}
			}
		}
	});

	const triggerListener = (
		element: HTMLElement,
		intersectOrRemove: boolean,
	) => {
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

	mutationObserver.observe(document.body, {
		childList: true,
		subtree: true,
	});

	const listenIntersectionOrRemove = (
		element: HTMLElement,
		callback: (intersectOrRemove: boolean) => void,
	) => {
		if (callbacks.has(element)) return;
		callbacks.set(element, callback);
		intersectionObserver.observe(element);
	};
	const listenRemove = (element: HTMLElement, callback: () => void) => {
		if (callbacks.has(element)) return;
		callbacks.set(element, callback);
	};

	onCleanup(() => {
		intersectionObserver.disconnect();
		mutationObserver.disconnect();
		callbacks = new WeakMap();
	});

	return [listenIntersectionOrRemove, listenRemove] as const;
}
