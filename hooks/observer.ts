import { onCleanup } from "solid-js";

export function createNodeObserver() {
	let callbacks = new WeakMap<
		Element,
		[(intersectOrRemove: boolean) => void]
	>();
	const intersectionObserver = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			if (entry.isIntersecting) {
				const element = entry.target;
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

	const triggerListener = (element: Element, intersectOrRemove: boolean) => {
		const cbs = callbacks.get(element);
		if (cbs) {
			for (const cb of cbs) {
				cb(intersectOrRemove);
			}
			if (!intersectOrRemove) {
				intersectionObserver.unobserve(element);
				callbacks.delete(element);
			}
		}
	};

	mutationObserver.observe(document.body, {
		childList: true,
		subtree: true,
	});

	const listenIntersectionOrRemove = (
		node: Node,
		callback: (intersectOrRemove: boolean) => void,
	) => {
		const element = node instanceof Element ? node : node.parentElement;
		if (!element) {
			callback(false);
			return;
		}

		const cur = callbacks.get(element);
		if (cur) cur.push(callback);
		else callbacks.set(element, [callback]);
		intersectionObserver.observe(element);
	};
	const listenRemove = (node: Node, callback: () => void) => {
		const element = node instanceof Element ? node : node.parentElement;
		if (!element) {
			callback();
			return;
		}

		const cur = callbacks.get(element);
		if (cur) cur.push((r) => !r && callback());
		else callbacks.set(element, [(r) => !r && callback()]);
	};

	onCleanup(() => {
		intersectionObserver.disconnect();
		mutationObserver.disconnect();
		callbacks = new WeakMap();
	});

	return [listenIntersectionOrRemove, listenRemove] as const;
}
