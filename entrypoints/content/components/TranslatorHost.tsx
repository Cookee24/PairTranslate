import { createEffect, createSignal, Show } from "solid-js";
import { createDomainEnabledTimer } from "~/hooks/domain-timer";
import { useKeyboardShortcut } from "~/hooks/keyboard-shortcut";
import { useSettings } from "~/hooks/settings";
import { useWebsiteRule } from "~/hooks/website-rule";
import FloatingBall from "./FloatingBall";
import FourFingerTap from "./FourFingerTap";
import InputTranslator from "./InputTranslator";
import InTextTranslator from "./InTextTranslator";
import SelectionInTextTranslator from "./SelectionInTextTranslator";

export default () => {
	const { settings } = useSettings();
	const websiteRule = useWebsiteRule();
	const [inTextTranslateEnabled, setInTextTranslateEnabled] =
		createSignal(false);
	const [inputTranslateElement, setInputTranslateElement] = createSignal<
		HTMLElement | undefined
	>(undefined, { equals: false });

	const [remaining] = createDomainEnabledTimer();
	createEffect(() => {
		if ((remaining() || 0) > 0) setInTextTranslateEnabled(true);
	});

	createEffect(() => {
		setInTextTranslateEnabled((prev) => websiteRule.enableTranslation ?? prev);
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
				keyed
			>
				<FloatingBall
					translateEnabled={inTextTranslateEnabled()}
					onSwitch={() => setInTextTranslateEnabled((v) => !v)}
				/>
			</Show>

			<FourFingerTap onToggle={() => setInTextTranslateEnabled((v) => !v)} />

			<Show when={inTextTranslateEnabled()} keyed>
				<InTextTranslator />
			</Show>

			<Show when={settings.basic.inputTranslateEnabled} keyed>
				<InputTranslator
					element={inputTranslateElement()}
					onClose={() => setInputTranslateElement(undefined)}
				/>
			</Show>

			<Show when={settings.basic.selectionTranslateEnabled} keyed>
				<SelectionInTextTranslator />
			</Show>
		</>
	);
};
