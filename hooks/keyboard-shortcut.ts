import type { Accessor } from "solid-js";
import { createEffect, onCleanup } from "solid-js";

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

/**
 * Parse a keyboard shortcut string into its components
 * Supports formats like "Ctrl+Shift+T", "Cmd+Option+T", etc.
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

	parts.forEach((part) => {
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
				// Remove any remaining modifiers and get the key
				const cleanKey = part.replace(
					/^(ctrl|alt|shift|cmd|command|meta|win)\+/,
					"",
				);
				parsed.key = cleanKey.length === 1 ? cleanKey : part;
			}
		}
	});

	return parsed;
}

/**
 * Check if a keyboard event matches the parsed shortcut
 */
function matchesShortcut(
	event: KeyboardEvent,
	shortcut: ParsedShortcut,
): boolean {
	// Normalize the key - handle special cases and letter case
	const eventKey = event.key.toLowerCase();
	const shortcutKey = shortcut.key.toLowerCase();

	// Special handling for common keys
	const keyMap: Record<string, string> = {
		" ": "space",
		arrowup: "up",
		arrowdown: "down",
		arrowleft: "left",
		arrowright: "right",
		escape: "esc",
	};

	const normalizedEventKey = keyMap[eventKey] || eventKey;
	const normalizedShortcutKey = keyMap[shortcutKey] || shortcutKey;

	return (
		event.ctrlKey === shortcut.ctrlKey &&
		event.altKey === shortcut.altKey &&
		event.shiftKey === shortcut.shiftKey &&
		event.metaKey === shortcut.metaKey &&
		normalizedEventKey === normalizedShortcutKey
	);
}

/**
 * Hook for handling keyboard shortcuts
 * @param shortcutString - The keyboard shortcut string (e.g., "Ctrl+Shift+T")
 * @param callback - Function to call when shortcut is triggered
 * @param options - Additional options for the shortcut behavior
 */
export function useKeyboardShortcut(
	shortcutString: Accessor<string>,
	callback: () => void,
	options: KeyboardShortcutOptions = {},
): void {
	const {
		enabled = () => true,
		preventDefault = true,
		stopPropagation = true,
		allowInInput = false,
	} = options;

	const handleKeyDown = (event: KeyboardEvent) => {
		// Don't trigger if disabled
		if (!enabled()) return;

		// Don't trigger in input fields unless explicitly allowed
		if (!allowInInput) {
			const target = event.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable ||
				target.getAttribute("role") === "textbox"
			) {
				return;
			}
		}

		// Parse and check the shortcut
		const shortcut = parseShortcut(shortcutString());
		if (matchesShortcut(event, shortcut)) {
			if (preventDefault) {
				event.preventDefault();
			}
			if (stopPropagation) {
				event.stopPropagation();
			}
			callback();
		}
	};

	createEffect(() => {
		if (enabled()) {
			document.addEventListener("keydown", handleKeyDown, { capture: true });
		}
	});

	onCleanup(() => {
		document.removeEventListener("keydown", handleKeyDown, { capture: true });
	});
}

/**
 * Utility function to validate a shortcut string
 */
export function isValidShortcut(shortcut: string): boolean {
	if (!shortcut || typeof shortcut !== "string") return false;

	const parts = shortcut.split("+");
	if (parts.length < 2) return false; // Need at least modifier + key

	const validModifiers = [
		"ctrl",
		"control",
		"alt",
		"option",
		"shift",
		"cmd",
		"command",
		"meta",
		"win",
	];
	const hasModifier = parts.some((part) =>
		validModifiers.includes(part.toLowerCase()),
	);

	if (!hasModifier) return false;

	// Last part should be the key
	const key = parts[parts.length - 1].toLowerCase();
	return (
		key.length === 1 ||
		["space", "up", "down", "left", "right", "esc", "enter", "tab"].includes(
			key,
		)
	);
}

/**
 * Utility function to format shortcut for display
 */
export function formatShortcut(shortcut: string): string {
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
					return "↑";
				case "arrowdown":
					return "↓";
				case "arrowleft":
					return "←";
				case "arrowright":
					return "→";
				case "escape":
					return "Esc";
				default:
					return part.toUpperCase();
			}
		})
		.join(" + ");
}
