export const animate: typeof import("motion/mini").animate = async (...args) =>
	// @ts-ignore
	import.meta.env.FIREFOX
		? import("motion").then((m) => m.animate(...args))
		: import("motion/mini").then((m) => m.animate(...args));
