import type { Accessor } from "solid-js";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { isInput } from "~/utils/is-input";
import { getDefaultModifierKey, type ModifierKey } from "~/utils/modifier";

interface KeyboardShortcutOptions {
	enabled?: Accessor<boolean>;
	preventDefault?: boolean;
	stopPropagation?: boolean;
	allowInInput?: boolean;
}

interface ParsedShortcut {
	ctrlKey: boolean;
	altKey: boolean;
	shiftKey: boolean;
	metaKey: boolean;
	key: string;
}

const KEY_ALIAS_MAP: Record<string, string> = {
	" ": "space",
	arrowup: "up",
	arrowdown: "down",
	arrowleft: "left",
	arrowright: "right",
	escape: "esc",
	return: "enter",
};

/**
 * Parse a keyboard shortcut string into its components
 */
function parseShortcut(shortcut: string): ParsedShortcut {
	const parts = shortcut.toLowerCase().split("+");
	const parsed: ParsedShortcut = {
		ctrlKey: false,
		altKey: false,
		shiftKey: false,
		metaKey: false,
		key: "",
	};

	for (const part of parts) {
		switch (part) {
			case "ctrl":
			case "control":
				parsed.ctrlKey = true;
				break;
			case "alt":
			case "option":
				parsed.altKey = true;
				break;
			case "shift":
				parsed.shiftKey = true;
				break;
			case "cmd":
			case "command":
			case "meta":
			case "win":
				parsed.metaKey = true;
				break;
			default: {
				parsed.key = part;
			}
		}
	}

	return parsed;
}

function matchesShortcut(
	event: KeyboardEvent,
	shortcut: ParsedShortcut,
): boolean {
	if (
		event.ctrlKey !== shortcut.ctrlKey ||
		event.altKey !== shortcut.altKey ||
		event.shiftKey !== shortcut.shiftKey ||
		event.metaKey !== shortcut.metaKey
	) {
		return false;
	}

	const eventKey = event.key.toLowerCase();
	const shortcutKey = shortcut.key.toLowerCase();
	const normalizedEventKey = KEY_ALIAS_MAP[eventKey] || eventKey;
	const normalizedShortcutKey = KEY_ALIAS_MAP[shortcutKey] || shortcutKey;

	if (normalizedEventKey === normalizedShortcutKey) {
		return true;
	}

	if (shortcut.altKey) {
		const code = event.code.toLowerCase(); // e.g., "keys", "digit1"

		if (code === `key${normalizedShortcutKey}`) {
			return true;
		}
		if (code === `digit${normalizedShortcutKey}`) {
			return true;
		}
		if (code === `numpad${normalizedShortcutKey}`) {
			return true;
		}
	}

	return false;
}

/**
 * Hook for handling keyboard shortcuts
 */
export function createKeyboardShortcut(
	shortcutString: Accessor<string>,
	callback: (event: KeyboardEvent, inInput: boolean) => void,
	options: KeyboardShortcutOptions = {},
): void {
	const {
		enabled = () => true,
		preventDefault = true,
		stopPropagation = true,
		allowInInput = false,
	} = options;

	const parsedShortcut = createMemo(() => parseShortcut(shortcutString()));

	const handleKeyDown = (event: KeyboardEvent) => {
		if (!enabled()) return;

		const shortcut = parsedShortcut();
		if (!shortcut.key) return;

		if (matchesShortcut(event, shortcut)) {
			const target = event.target as HTMLElement;
			const inInput = isInput(target);

			if (inInput && !allowInInput) return;

			if (preventDefault) {
				event.preventDefault();
			}
			if (stopPropagation) {
				event.stopPropagation();
			}

			callback(event, inInput);
		}
	};

	createEffect(() => {
		if (enabled()) {
			document.addEventListener("keydown", handleKeyDown, { capture: true });
			onCleanup(() => {
				document.removeEventListener("keydown", handleKeyDown, {
					capture: true,
				});
			});
		}
	});
}

export function createModifierKey(
	modifierKey: Accessor<ModifierKey | undefined> = () =>
		getDefaultModifierKey(),
): Accessor<boolean> {
	const [isPressed, setIsPressed] = createSignal(false);

	createEffect(() => {
		const targetKey = modifierKey();
		if (!targetKey) return;

		const handleKey = (event: KeyboardEvent, pressed: boolean) => {
			if (event.key === targetKey) {
				setIsPressed(pressed);
			}
		};

		const onDown = (e: KeyboardEvent) => handleKey(e, true);
		const onUp = (e: KeyboardEvent) => handleKey(e, false);
		const onBlur = () => setIsPressed(false);

		document.addEventListener("keydown", onDown);
		document.addEventListener("keyup", onUp);
		window.addEventListener("blur", onBlur);

		onCleanup(() => {
			setIsPressed(false);
			document.removeEventListener("keydown", onDown);
			document.removeEventListener("keyup", onUp);
			window.removeEventListener("blur", onBlur);
		});
	});

	return isPressed;
}

/**
 * Utility function to validate a shortcut string
 */
export function isValidShortcut(shortcut: string): boolean {
	if (!shortcut || typeof shortcut !== "string") return false;

	const parts = shortcut.split("+");
	if (parts.length < 2) return false;

	const validModifiers = new Set([
		"ctrl",
		"control",
		"alt",
		"option",
		"shift",
		"cmd",
		"command",
		"meta",
		"win",
	]);

	const hasModifier = parts.some((part) =>
		validModifiers.has(part.toLowerCase()),
	);

	if (!hasModifier) return false;

	const key = parts[parts.length - 1].toLowerCase();
	return (
		key.length === 1 ||
		KEY_ALIAS_MAP[key] !== undefined ||
		["enter", "tab", "backspace", "delete"].includes(key)
	);
}

/**
 * Utility function to format shortcut for display
 */
export function formatShortcut(shortcut: string): string {
	if (!shortcut) return "";

	return shortcut
		.split("+")
		.map((part) => {
			const lower = part.toLowerCase();
			switch (lower) {
				case "ctrl":
				case "control":
					return "Ctrl";
				case "alt":
				case "option":
					return "Alt";
				case "shift":
					return "Shift";
				case "cmd":
				case "command":
				case "meta":
				case "win":
					return "Cmd";
				case " ":
				case "space":
					return "Space";
				case "arrowup":
				case "up":
					return "↑";
				case "arrowdown":
				case "down":
					return "↓";
				case "arrowleft":
				case "left":
					return "←";
				case "arrowright":
				case "right":
					return "→";
				case "escape":
				case "esc":
					return "Esc";
				default:
					return part.charAt(0).toUpperCase() + part.slice(1);
			}
		})
		.join(" + ");
}
