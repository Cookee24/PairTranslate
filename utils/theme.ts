const themeMap = {
	light: "lemonade",
	dark: "dim",
	system: undefined,
};

export const getThemeClass = (theme: string) => {
	return themeMap[theme as keyof typeof themeMap] || undefined;
};
