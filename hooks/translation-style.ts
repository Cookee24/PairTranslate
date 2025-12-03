import { createMemo } from "solid-js";
import type { TranslationStyleSettings } from "../utils/settings/def";

const COLOR_PRESETS = [
	"rgba(255,101,159,0.25)", // Pink
	"rgba(103,223,255,0.25)", // Light Blue
	"rgba(131,241,141,0.25)", // Light Green
	"rgba(181,129,254,0.25)", // Light Purple
	"rgba(252,241,81,0.25)", // Light Yellow
] as const;

const BACKGROUND_CYCLE: readonly (string | undefined)[] = [
	undefined,
	...COLOR_PRESETS,
];

export const nextBackgroundColor = (current?: string): string | undefined => {
	console.log("CURRENT:", current);
	const currentIndex = BACKGROUND_CYCLE.indexOf(current);
	console.log("current index:", currentIndex);
	const nextIndex =
		currentIndex === -1 ? 1 : (currentIndex + 1) % BACKGROUND_CYCLE.length;
	return BACKGROUND_CYCLE[nextIndex];
};

export const createTranslationStyle = (
	style: () => TranslationStyleSettings,
) => {
	return createMemo(() => {
		const cur = style();

		const lines = [];
		if (cur.bold) {
			lines.push("font-weight: 600 !important;");
		}
		if (cur.italic) {
			lines.push("font-style: italic !important;");
		}
		if (cur.underline) {
			lines.push("text-decoration: underline !important;");
		}
		if (cur.background) {
			lines.push(`background-color: ${cur.background} !important;`);
		}

		return lines.join("\n");
	});
};
