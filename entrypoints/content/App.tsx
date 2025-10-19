import FloatingBall from "./components/FloatingBall";
import InTextTranslator from "./components/InTextTranslator";
import { PopupProvider, PopupRenderer } from "./components/Popup";
import Style from "./components/Style";
import Task from "./components/Task";
import TipRenderer from "./components/TipRenderer";

const Content = () => {
	const { settings } = useSettings();
	const [translateEnabled, setTranslateEnabled] = createSignal(false);

	// Handle keyboard shortcut
	useKeyboardShortcut(
		() => settings.basic.keyboardShortcut,
		() => setTranslateEnabled((v) => !v),
		{
			enabled: () =>
				settings.basic.keyboardShortcutEnabled && settings.basic.enabled,
			preventDefault: true,
			stopPropagation: true,
			allowInInput: false,
		},
	);

	return (
		<Show when={settings.basic.enabled}>
			<div
				class="absolute w-0 h-0 left-0 top-0"
				attr:data-theme={getThemeClass(settings.basic.theme)}
			>
				<Style />
				<FloatingBall
					enabled={translateEnabled()}
					onSwitch={() => setTranslateEnabled((v) => !v)}
				/>
				<InTextTranslator enabled={translateEnabled()} />
				<PopupRenderer />
				<TipRenderer />
				<Task />
			</div>
		</Show>
	);
};

export default () => {
	return (
		<SettingsProvider>
			<PopupProvider>
				<TaskListProvider>
					<Content />
				</TaskListProvider>
			</PopupProvider>
		</SettingsProvider>
	);
};
