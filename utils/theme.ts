const themeMap = {
	light: "cmyk",
	dark: "forest",
	system: undefined,
};

export const getThemeClass = (theme: string) => {
	return themeMap[theme as keyof typeof themeMap] || undefined;
};
