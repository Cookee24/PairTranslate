import FloatingBall from "./FloatingBall";
import InputTranslator from "./InputTranslator";
import InTextTranslator from "./InTextTranslator";
import SelectionInTextTranslator from "./SelectionInTextTranslator";

export default () => {
	const { settings } = useSettings();
	const websiteRule = useWebsiteRule();
	const [inTextTranslateEnabled, setInTextTranslateEnabled] = createSignal(
		websiteRule.enableTranslation ?? false,
	);
	const [inputTranslateElement, setInputTranslateElement] = createSignal<
		HTMLElement | undefined
	>(undefined, { equals: false });

	const [remaining] = createDomainEnabledTimer();
	createEffect(() => {
		if ((remaining() || 0) > 0) setInTextTranslateEnabled(true);
	});

	// Handle keyboard shortcut
	useKeyboardShortcut(
		() => settings.basic.keyboardShortcut,
		(event, inInput) => {
			if (inInput && settings.basic.inputTranslateEnabled) {
				setInputTranslateElement(event.target as HTMLElement);
			} else {
				setInTextTranslateEnabled((prev) => !prev);
			}
		},
		{
			enabled: () => settings.basic.keyboardShortcutEnabled,
			allowInInput: true,
		},
	);

	return (
		<>
			<Show
				when={
					websiteRule.floatingBallEnabled ?? settings.basic.floatingBallEnabled
				}
			>
				<FloatingBall
					translateEnabled={inTextTranslateEnabled()}
					onSwitch={() => setInTextTranslateEnabled((v) => !v)}
				/>
			</Show>
			<InTextTranslator enabled={inTextTranslateEnabled()} />
			<Show when={settings.basic.inputTranslateEnabled}>
				<InputTranslator
					element={inputTranslateElement()}
					onClose={() => setInputTranslateElement(undefined)}
				/>
			</Show>
			<SelectionInTextTranslator
				enabled={settings.basic.selectionTranslateEnabled}
			/>
		</>
	);
};
