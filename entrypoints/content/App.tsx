import { PopupProvider, PopupRenderer } from "./components/Popup";
import Style from "./components/Style";
import Task from "./components/Task";
import TipRenderer from "./components/TipRenderer";
import TranslatorHost from "./components/TranslatorHost";

const Content = () => {
	const { settings } = useSettings();

	return (
		<Show when={settings.basic.enabled}>
			<div
				class="absolute w-0 h-0 left-0 top-0"
				attr:data-theme={getThemeClass(settings.basic.theme)}
			>
				<Style />
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
