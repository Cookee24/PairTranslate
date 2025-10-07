import { createSignal, onCleanup } from "solid-js";
import { formatShortcut, isValidShortcut } from "~/hooks/keyboard-shortcut";

interface ShortcutInputProps {
	value: string;
	enabled: boolean;
	onChange: (shortcut: string) => void;
	onEnabledChange: (enabled: boolean) => void;
}

export default (props: ShortcutInputProps) => {
	const [recording, setRecording] = createSignal(false);
	const [tempShortcut, setTempShortcut] = createSignal("");
	const [error, setError] = createSignal("");

	const handleShortcutKeydown = (event: KeyboardEvent) => {
		event.preventDefault();

		const parts: string[] = [];
		if (event.ctrlKey) parts.push("Ctrl");
		if (event.altKey) parts.push("Alt");
		if (event.shiftKey) parts.push("Shift");
		if (event.metaKey) parts.push("Cmd");

		let key = event.key.toLowerCase();

		// Handle special keys
		switch (key) {
			case " ":
				key = "Space";
				break;
			case "arrowup":
				key = "Up";
				break;
			case "arrowdown":
				key = "Down";
				break;
			case "arrowleft":
				key = "Left";
				break;
			case "arrowright":
				key = "Right";
				break;
			case "escape":
				key = "Esc";
				break;
			case "enter":
				key = "Enter";
				break;
			case "tab":
				key = "Tab";
				break;
			default:
				// Single letter keys
				if (key.length === 1) {
					key = key.toUpperCase();
				}
		}

		// Don't allow modifier keys alone
		if (
			[
				"ctrl",
				"alt",
				"shift",
				"meta",
				"control",
				"option",
				"command",
				"win",
			].includes(key.toLowerCase())
		) {
			return;
		}

		parts.push(key);
		const shortcut = parts.join("+");

		if (isValidShortcut(shortcut)) {
			setTempShortcut(shortcut);
			setError("");
		} else {
			setError(t("settings.basic.keyboardShortcutInvalid"));
		}
	};

	const startRecording = () => {
		setRecording(true);
		setTempShortcut("");
		setError("");
	};

	const stopRecording = () => {
		setRecording(false);
		if (tempShortcut() && !error()) {
			props.onChange(tempShortcut());
		}
		setTempShortcut("");
	};

	const cancelRecording = () => {
		setRecording(false);
		setTempShortcut("");
		setError("");
	};

	const handleGlobalKeydown = (event: KeyboardEvent) => {
		if (recording()) {
			// ESC key cancels recording
			if (event.key === "Escape") {
				cancelRecording();
				event.preventDefault();
				return;
			}

			handleShortcutKeydown(event);

			// Stop recording after a valid shortcut is recorded
			if (tempShortcut() && !error()) {
				stopRecording();
			}
		}
	};

	createEffect(() => {
		if (recording()) {
			document.addEventListener("keydown", handleGlobalKeydown, {
				capture: true,
			});
		} else {
			document.removeEventListener("keydown", handleGlobalKeydown, {
				capture: true,
			});
		}
	});

	onCleanup(() => {
		document.removeEventListener("keydown", handleGlobalKeydown, {
			capture: true,
		});
	});

	return (
		<div class="form-control">
			<div class="flex items-center justify-between mb-2">
				<label class="label">
					<span class="label-text font-medium">
						{t("settings.basic.keyboardShortcut")}
					</span>
				</label>
				<label class="label cursor-pointer">
					<span class="label-text mr-2">{t("common.enabled")}</span>
					<input
						type="checkbox"
						class="toggle toggle-primary"
						checked={props.enabled}
						onChange={(e) => props.onEnabledChange(e.target.checked)}
					/>
				</label>
			</div>

			<div class="label-text-alt text-xs mb-2 block">
				{t("settings.basic.keyboardShortcutDesc")}
			</div>

			<div class="join mb-3">
				<input
					type="text"
					class="input input-bordered join-item flex-1"
					value={recording() ? tempShortcut() : formatShortcut(props.value)}
					placeholder={t("settings.basic.keyboardShortcutHint")}
					readOnly
					classList={{
						"input-error": !!error(),
						"input-primary": recording(),
					}}
				/>
				<button
					type="button"
					class="btn btn-primary join-item"
					onClick={recording() ? cancelRecording : startRecording}
					disabled={!props.enabled}
				>
					{recording() ? t("shortcuts.cancel") : t("shortcuts.record")}
				</button>
			</div>

			{error() && <div class="text-error text-sm mb-2">{error()}</div>}

			<div class="label-text-alt text-xs mb-2 block">
				{recording()
					? t("shortcuts.pressCombination")
					: t("settings.basic.keyboardShortcutHint")}
			</div>
		</div>
	);
};
