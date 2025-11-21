import { hasMeaningfulChars } from "~/utils/blank";
import type { SelectEvent } from "./types";

export async function* selectionListener() {
	let cancel: (() => void) | undefined;
	try {
		while (true) {
			const { promise, resolve } = Promise.withResolvers<SelectEvent>();
			cancel = listener(resolve);
			yield await promise;
		}
	} finally {
		cancel?.();
	}
}

const listener = (callback: (data: SelectEvent) => void) => {
	let canceled = false;
	let id: NodeJS.Timeout | undefined;
	const cancel = () => {
		canceled = true;
		if (id !== undefined) clearTimeout(id);
	};

	const work = async () => {
		const { promise: sPromise, resolve: sResolve } =
			Promise.withResolvers<Event>();
		const { promise: pointerPromise, resolve: pointerResolve } =
			Promise.withResolvers<MouseEvent | TouchEvent>();
		try {
			document.addEventListener("selectstart", sResolve, {
				once: true,
				passive: true,
			});
			const _sData = await sPromise;

			const mouseupHandler = (e: MouseEvent) => pointerResolve(e);
			const touchendHandler = (e: TouchEvent) => pointerResolve(e);

			document.addEventListener("mouseup", mouseupHandler, {
				once: true,
				passive: true,
			});
			document.addEventListener("touchend", touchendHandler, {
				once: true,
				passive: true,
			});

			const pointerData = await pointerPromise;

			document.removeEventListener("mouseup", mouseupHandler);
			document.removeEventListener("touchend", touchendHandler);

			const selection = window.getSelection();
			const text = selection?.toString().trim();
			if (selection && hasMeaningfulChars(text)) {
				let x: number;
				let y: number;

				if (pointerData instanceof MouseEvent) {
					x = pointerData.clientX;
					y = pointerData.clientY;
				} else {
					const touch = pointerData.changedTouches[0];
					x = touch.clientX;
					y = touch.clientY;
				}

				callback({
					selection,
					position: { x, y },
				});
				return;
			}

			if (!canceled) id = setTimeout(work, 0);
		} finally {
			document.removeEventListener("selectstart", sResolve);
		}
	};
	id = setTimeout(work, 0);

	return cancel;
};
