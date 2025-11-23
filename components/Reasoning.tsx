import { createEffect, createSignal, onCleanup } from "solid-js";
import { MdStyled } from "./MD";

// Shared ResizeObserver instance
let sharedResizeObserver: ResizeObserver | null = null;
const resizeCallbacks = new WeakMap<Element, () => void>();

const getSharedResizeObserver = () => {
	if (!sharedResizeObserver) {
		sharedResizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const callback = resizeCallbacks.get(entry.target);
				callback?.();
			}
		});
	}
	return sharedResizeObserver;
};

export const ScrollableReasoning = (props: { text: string }) => {
	const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();
	const [showTop, setShowTop] = createSignal(false);
	const [showBottom, setShowBottom] = createSignal(false);

	const checkScroll = () => {
		const el = containerRef();
		if (!el) return;

		const { scrollTop, scrollHeight, clientHeight } = el;
		setShowTop(scrollTop > 0);
		setShowBottom(scrollTop + clientHeight < scrollHeight - 1);
	};

	createEffect(() => {
		const el = containerRef();
		if (!el) return;

		checkScroll();
		el.addEventListener("scroll", checkScroll, { passive: true });

		const observer = getSharedResizeObserver();
		resizeCallbacks.set(el, checkScroll);
		observer.observe(el);

		onCleanup(() => {
			el.removeEventListener("scroll", checkScroll);
			observer.unobserve(el);
			resizeCallbacks.delete(el);
		});
	});

	return (
		<div class="w-full flex flex-col">
			<span class="w-full mx-2 text-end align-middle text-xs">
				{showTop() ? "↑" : "•"}
			</span>
			<div ref={setContainerRef} class="max-h-32 overflow-y-auto">
				<MdStyled text={props.text} />
			</div>
			<span class="w-full mx-2 text-end align-middle text-xs">
				{showBottom() ? "↓" : "•"}
			</span>
		</div>
	);
};
