import { PopupProvider, PopupRenderer } from "./components/Popup";
import Task from "./components/Task";
import TipRenderer from "./components/TipRenderer";
import TranslatorHost from "./components/TranslatorHost";

const Content = () => {
	const { settings } = useSettings();
	// Media query is not supported in shadow DOM, so manually apply theme class
	const theme = createTheme(settings.basic.theme);

	return (
		<Show when={settings.basic.enabled}>
			<div
				class="absolute w-0 h-0 left-0 top-0"
				attr:data-theme={getThemeClass(theme())}
			>
				<ContentStyle />
				<KatexStyle />
				<TranslatorHost />
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
