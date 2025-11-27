import { onCleanup } from "solid-js";

export function createIdleDebounce(fn: () => void, delay: number = 200) {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let idleId: number | null = null;
	let rafId: number | null = null;

	timeoutId = setTimeout(() => {
		if (typeof requestIdleCallback !== "undefined") {
			idleId = requestIdleCallback(
				() => {
					rafId = requestAnimationFrame(fn);
				},
				{ timeout: delay },
			);
		} else {
			rafId = requestAnimationFrame(fn);
		}
	}, delay);

	onCleanup(() => {
		if (timeoutId) clearTimeout(timeoutId);
		if (idleId && typeof cancelIdleCallback !== "undefined")
			cancelIdleCallback(idleId);
		if (rafId) cancelAnimationFrame(rafId);

		timeoutId = null;
		idleId = null;
		rafId = null;
	});
}

export function createRequestAnimationFrame(fn: () => void) {
	const rafId = requestAnimationFrame(fn);

	onCleanup(() => cancelAnimationFrame(rafId));
}
