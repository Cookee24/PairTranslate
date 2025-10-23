export const createTheme = (
	theme = "system",
): (() => "light" | "dark" | "system" | string) => {
	if (theme !== "system") return () => theme;

	const [systemTheme, setSystemTheme] = createSignal<"light" | "dark">("light");

	if (window?.matchMedia) {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const updateSystemTheme = (e: MediaQueryListEvent | MediaQueryList) => {
			setSystemTheme(e.matches ? "dark" : "light");
		};
		updateSystemTheme(mediaQuery);
		mediaQuery.addEventListener("change", updateSystemTheme);
	}

	return systemTheme;
};
