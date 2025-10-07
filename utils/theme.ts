const themeMap = {
	light: "nord",
	dark: "dracula",
	system: undefined,
};

export const getThemeClass = (theme: string) => {
	return themeMap[theme as keyof typeof themeMap] || undefined;
};
