import FloatingBall from "./FloatingBall";
import InputTranslator from "./InputTranslator";
import InTextTranslator from "./InTextTranslator";
import SelectionInTextTranslator from "./SelectionInTextTranslator";

export default () => {
	const { settings } = useSettings();
	const [inTextTranslateEnabled, setInTextTranslateEnabled] =
		createSignal(false);
	const [inputTranslateElement, setInputTranslateElement] = createSignal<
		HTMLElement | undefined
	>(undefined, { equals: false });

	// Handle keyboard shortcut
	useKeyboardShortcut(
		() => settings.basic.keyboardShortcut,
		(event, inInput) => {
			if (inInput && settings.basic.inputTranslateEnabled) {
				setInputTranslateElement(event.target as HTMLElement);
			} else {
				setInTextTranslateEnabled(true);
			}
		},
		{
			enabled: () => settings.basic.keyboardShortcutEnabled,
			allowInInput: true,
		},
	);

	return (
		<>
			<FloatingBall
				enabled={inTextTranslateEnabled()}
				onSwitch={() => setInTextTranslateEnabled((v) => !v)}
			/>
			<InTextTranslator enabled={inTextTranslateEnabled()} />
			<Show when={settings.basic.inputTranslateEnabled}>
				<InputTranslator
					element={inputTranslateElement()}
					onClose={() => setInputTranslateElement(undefined)}
				/>
			</Show>
			<SelectionInTextTranslator />
		</>
	);
};
