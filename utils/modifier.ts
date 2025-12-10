import { isApple } from "./isapple";

export const MODIFIER_KEYS = ["Alt", "Control", "Shift", "Meta"] as const;
export type ModifierKey = (typeof MODIFIER_KEYS)[number];

export const getDefaultModifierKey = (): ModifierKey =>
	isApple() ? "Alt" : "Control";

export const getModifierOptions = (): {
	value: ModifierKey;
	label: string;
}[] =>
	isApple()
		? [
				{ value: "Alt", label: "⌥ Option" },
				{ value: "Control", label: "⌃ Control" },
				{ value: "Meta", label: "⌘ Command" },
				{ value: "Shift", label: "⇧ Shift" },
			]
		: [
				{ value: "Alt", label: "Alt" },
				{ value: "Control", label: "Ctrl" },
				{ value: "Shift", label: "Shift" },
			];

export const formatModifierHint = (key?: ModifierKey): string => {
	if (!key) return "";
	if (isApple()) {
		switch (key) {
			case "Alt":
				return "⌥";
			case "Control":
				return "⌃";
			case "Meta":
				return "⌘";
			case "Shift":
				return "⇧";
		}
	}
	if (key === "Control") return "Ctrl";
	return key;
};
