import type { SelectEvent } from "./types";

export async function* selectionListener() {
	let cancel: (() => void) | undefined;
	try {
		while (true) {
			const { promise, resolve } = Promise.withResolvers<SelectEvent>();
			cancel = listener(resolve).cancel;
			yield await promise;
		}
	} finally {
		cancel?.();
	}
}

const listener = (callback: (data: SelectEvent) => void) => {
	let canceled = false;
	let id: number | undefined;
	const cancel = () => {
		canceled = true;
		if (id !== undefined) cancelIdleCallback(id);
	};

	const work = async () => {
		const { promise: sPromise, resolve: sResolve } =
			Promise.withResolvers<Event>();
		const { promise: mPromise, resolve: mResolve } =
			Promise.withResolvers<MouseEvent>();
		try {
			document.addEventListener("selectstart", sResolve, {
				once: true,
				passive: true,
			});
			const _sData = await sPromise;

			document.addEventListener("mouseup", mResolve, {
				once: true,
				passive: true,
			});
			const mData = await mPromise;

			const selection = window.getSelection();
			const text = selection?.toString().trim();
			if (selection && hasMeaningfulChars(text)) {
				callback({
					selection,
					position: { x: mData.clientX, y: mData.clientY },
				});
				return;
			}

			if (!canceled) id = requestIdleCallback(work);
		} finally {
			document.removeEventListener("selectstart", sResolve);
			document.removeEventListener("mouseup", mResolve);
		}
	};
	id = requestIdleCallback(work);

	return { cancel };
};
