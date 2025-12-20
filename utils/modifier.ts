import { t } from "./i18n";
import { isApple } from "./isapple";

export const MODIFIER_KEYS = ["Alt", "Control", "Shift", "Meta"] as const;
export type ModifierKey = (typeof MODIFIER_KEYS)[number];

export const TRIPLE_MODIFIER_KEYS = [
	"TripleAlt",
	"TripleControl",
	"TripleShift",
	"TripleMeta",
] as const;
export const SELECTION_MODIFIER_KEYS = [
	"Alt",
	"Control",
	"Shift",
	"Meta",
	"TripleAlt",
	"TripleControl",
	"TripleShift",
	"TripleMeta",
] as const;
export type TripleModifierKey = (typeof TRIPLE_MODIFIER_KEYS)[number];
export type SelectionTranslateModifier =
	(typeof SELECTION_MODIFIER_KEYS)[number];

const TRIPLE_PREFIX = "Triple";
const toTripleModifier = (key: ModifierKey): TripleModifierKey =>
	`Triple${key}`;

export const getDefaultModifierKey = (): ModifierKey =>
	isApple() ? "Alt" : "Control";

export const getModifierOptions = (): {
	value: SelectionTranslateModifier;
	label: string;
}[] => {
	const baseOptions: { value: ModifierKey; label: string }[] = isApple()
		? [
				{ value: "Alt", label: "Option" },
				{ value: "Control", label: "Control" },
				{ value: "Meta", label: "Command" },
				{ value: "Shift", label: "Shift" },
			]
		: [
				{ value: "Alt", label: "Alt" },
				{ value: "Control", label: "Ctrl" },
				{ value: "Shift", label: "Shift" },
			];
	const tripleOptions = baseOptions.map((option) => ({
		value: toTripleModifier(option.value),
		label: t("settings.basic.selectionTranslateModifierTriple", [option.label]),
	}));

	return [...baseOptions, ...tripleOptions];
};

export const isTripleModifierKey = (
	key?: SelectionTranslateModifier,
): key is TripleModifierKey =>
	typeof key === "string" && key.startsWith(TRIPLE_PREFIX);

export const getBaseModifierKey = (
	key?: SelectionTranslateModifier,
): ModifierKey | undefined => {
	if (!key) return undefined;
	if (isTripleModifierKey(key)) {
		return key.slice(TRIPLE_PREFIX.length) as ModifierKey;
	}
	return key;
};

export const formatModifierHint = (
	key?: SelectionTranslateModifier,
): string => {
	const baseKey = getBaseModifierKey(key);
	if (!baseKey) return "";

	let label: string = baseKey;
	if (isApple()) {
		switch (baseKey) {
			case "Alt":
				label = "Option";
				break;
			case "Control":
				label = "Control";
				break;
			case "Meta":
				label = "Command";
				break;
			case "Shift":
				label = "Shift";
				break;
		}
	} else if (baseKey === "Control") {
		label = "Ctrl";
	}

	if (isTripleModifierKey(key)) {
		return t("settings.basic.selectionTranslateModifierTriple", [label]);
	}

	return label;
};
