import { createEffect, createSignal, onCleanup } from "solid-js";
import { useSettings } from "~/hooks/settings";

export const createThemeClass = (): (() =>
	| "light"
	| "dark"
	| "system"
	| string) => {
	const { settings } = useSettings();

	const [systemTheme, setSystemTheme] = createSignal<"light" | "dark">("light");

	createEffect(() => {
		const current = settings.basic.theme;

		if (current === "system") {
			const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
			const updateSystemTheme = (e: MediaQueryListEvent | MediaQueryList) => {
				setSystemTheme(e.matches ? "dark" : "light");
			};
			updateSystemTheme(mediaQuery);
			mediaQuery.addEventListener("change", updateSystemTheme);
			onCleanup(() =>
				mediaQuery.removeEventListener("change", updateSystemTheme),
			);
		} else {
			setSystemTheme(current);
		}
	});

	return systemTheme;
};
