import { PopupProvider, PopupRenderer } from "./components/Popup";
import Task from "./components/Task";
import TipRenderer from "./components/TipRenderer";
import TranslatorHost from "./components/TranslatorHost";

const Content = () => {
	// Media query is not supported in shadow DOM, so manually apply theme class
	const theme = createTheme();

	return (
		<div class="contents" attr:data-theme={getThemeClass(theme())}>
			<ContentStyle />
			<KatexStyle />
			<TranslatorHost />
			<PopupRenderer />
			<TipRenderer />
			<Task />
		</div>
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
