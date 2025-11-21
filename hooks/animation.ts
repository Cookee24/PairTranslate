import { spring } from "motion";
import { animate } from "motion/mini";
import {
	type Accessor,
	createEffect,
	createSignal,
	on,
	onCleanup,
} from "solid-js";

export const animateEnter = (element: Element) =>
	animate(
		element,
		{ opacity: [0, 1], scale: [0.8, 1], filter: ["blur(2px)", "blur(0px)"] },
		{ type: spring, bounce: 0, duration: 0.3 },
	);

export const animateExit = (element: Element) =>
	animate(
		element,
		{ opacity: [1, 0], scale: [1, 0.8], filter: ["blur(0px)", "blur(2px)"] },
		{ type: spring, bounce: 0, duration: 0.3 },
	);

export const animateLift = (element: Element) =>
	animate(
		element,
		{ boxShadow: "var(--shadow-lg)", scale: 0.98 },
		{ type: spring, bounce: 0, duration: 0.3 },
	);

export const animateDown = (element: Element) =>
	animate(
		element,
		{ boxShadow: "var(--shadow-md)", scale: 1 },
		{ type: spring, bounce: 0, duration: 0.3 },
	);

export const animateScaleUp = (element: Element) =>
	animate(element, { scale: 1.05 }, { type: spring, bounce: 0, duration: 0.3 });

export const animateScaleDown = (element: Element) =>
	animate(element, { scale: 1 }, { type: spring, bounce: 0, duration: 0.3 });

export const animateBlink = (element: Element, times = 1) => {
	const colors = [];

	for (let i = 0; i < times; i++) {
		colors.push("rgba(255,255,0,1)", "rgba(255,255,0,0)");
	}

	return animate(element, {
		backgroundColor: colors,
	}).then(() => {
		if (element instanceof HTMLElement) {
			element.style.backgroundColor = "";
		}
	});
};

export const animatePress = (element: Element) =>
	animate(element, { scale: 0.95 }, { type: spring, bounce: 0, duration: 0.2 });

export const animateFocus = (element: Element) =>
	animate(element, { scale: 1.1 }, { type: spring, bounce: 0, duration: 0.2 });

export const animateUnfocus = (element: Element) =>
	animate(element, { scale: 1 }, { type: spring, bounce: 0, duration: 0.2 });

export const animateClose = (element: Element) =>
	animate(
		element,
		{
			opacity: [1, 0],
			height: [element.clientHeight, 0],
			margin: [0, 0],
			padding: [0, 0],
			transform: ["translateY(0)", "translateY(-10px)"],
		},
		{ type: spring, bounce: 0, duration: 0.3 },
	);

export const animatePulse = (element: Element) =>
	animate(
		element,
		{ scale: [1, 1.1] },
		{ repeat: Infinity, repeatType: "reverse", duration: 1 },
	);

type AnimationFunction = (element: Element) => ReturnType<typeof animate>;

export const createAnimation = (
	element: Accessor<Element | undefined>,
	show: Accessor<boolean>[] | Accessor<boolean> = () => true,
	animateIn: AnimationFunction,
	animateOut: AnimationFunction,
) => {
	const show_ = Array.isArray(show) ? show : [show];
	createEffect(
		on([element, ...show_], ([el, ...isVisible]) => {
			if (!el) return;
			if (isVisible.every((v) => v)) {
				animateIn(el);
			} else {
				animateOut(el);
			}
		}),
	);
};

export const createAnimatedAppearance = (
	element: Accessor<Element | undefined>,
	show: Accessor<boolean>[] | Accessor<boolean> = () => true,
	enter = animateEnter,
	exit = animateExit,
) => {
	const isArray = Array.isArray(show);
	const showAll = () => {
		let all = true;
		// Must run all
		if (isArray) for (const s of show) all = s() && all;
		else all = show();
		return all;
	};

	const [render, setRender] = createSignal(false);
	createEffect(
		on([element, showAll], ([el, show]) => {
			show && setRender(true);

			if (!el) return;

			if (show) {
				enter(el);
			} else {
				exit(el).then(() => setRender(showAll));
			}
		}),
	);

	return render;
};

export const animatedHover = (
	element: Accessor<Element | undefined>,
	enabled: Accessor<boolean>[] | Accessor<boolean> = () => true,
	enter = animateScaleUp,
	exit = animateScaleDown,
) => {
	const enabled_ = Array.isArray(enabled) ? enabled : [enabled];
	createEffect(
		on([element, ...enabled_], ([el, ...isEnabled]) => {
			if (!el || !isEnabled.every(Boolean)) return;

			const handleEnter = () => enter(el);
			const handleLeave = () => exit(el);

			el.addEventListener("mouseenter", handleEnter, { passive: true });
			el.addEventListener("mouseleave", handleLeave, { passive: true });
			el.addEventListener("touchstart", handleEnter, { passive: true });
			el.addEventListener("touchend", handleLeave, { passive: true });

			onCleanup(() => {
				el.removeEventListener("mouseenter", handleEnter);
				el.removeEventListener("mouseleave", handleLeave);
				el.removeEventListener("touchstart", handleEnter);
				el.removeEventListener("touchend", handleLeave);
			});
		}),
	);
};

export const onOuterClick = (
	element: Accessor<Element | undefined>,
	onOuterClick: () => void,
	enabled: Accessor<boolean> = () => true,
) => {
	createEffect(
		on([element, enabled], ([el, isEnabled]) => {
			if (!el || !isEnabled) return;

			const handler = (event: MouseEvent | TouchEvent) => {
				if (!event.composedPath().includes(el)) {
					onOuterClick();
				}
			};

			document.addEventListener("mousedown", handler, { passive: true });
			document.addEventListener("touchstart", handler, { passive: true });
			onCleanup(() => {
				document.removeEventListener("mousedown", handler);
				document.removeEventListener("touchstart", handler);
			});
		}),
	);
};

export const animatedFocus = (
	element: Accessor<Element | undefined>,
	enabled: Accessor<boolean>[] | Accessor<boolean> = () => true,
	focus = animateFocus,
	unfocus = animateUnfocus,
) => {
	const enabled_ = Array.isArray(enabled) ? enabled : [enabled];
	createEffect(
		on([element, ...enabled_], ([el, ...isEnabled]) => {
			if (!el || !isEnabled.every(Boolean)) return;

			const handleFocus = () => focus(el);
			const handleBlur = () => unfocus(el);

			el.addEventListener("focus", handleFocus, { passive: true });
			el.addEventListener("blur", handleBlur, { passive: true });

			onCleanup(() => {
				el.removeEventListener("focus", handleFocus);
				el.removeEventListener("blur", handleBlur);
			});
		}),
	);
};

export const animatedPress = (
	element: Accessor<Element | undefined>,
	enabled: Accessor<boolean>[] | Accessor<boolean> = () => true,
	press = animatePress,
	release = animateScaleDown,
) => {
	const enabled_ = Array.isArray(enabled) ? enabled : [enabled];
	createEffect(
		on([element, ...enabled_], ([el, ...isEnabled]) => {
			if (!el || !isEnabled.every(Boolean)) return;

			const handlePress = () => press(el);
			const handleRelease = () => release(el);

			el.addEventListener("mousedown", handlePress, { passive: true });
			el.addEventListener("mouseup", handleRelease, { passive: true });
			el.addEventListener("mouseleave", handleRelease, { passive: true });

			onCleanup(() => {
				el.removeEventListener("mousedown", handlePress);
				el.removeEventListener("mouseup", handleRelease);
				el.removeEventListener("mouseleave", handleRelease);
			});
		}),
	);
};
