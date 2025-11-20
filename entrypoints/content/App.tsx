import { ProgressIndicatorProvider } from "~/hooks/progress-indicator";
import { PopupProvider, PopupRenderer } from "./components/Popup";
import ProgressIndicator from "./components/ProgressIndicator";
import TipRenderer from "./components/TipRenderer";
import TranslatorHost from "./components/TranslatorHost";

const Content = () => {
	// Media query is not supported in shadow DOM, so manually apply theme class
	const theme = createTheme();

	return (
		<div class="overlay-container" attr:data-theme={getThemeClass(theme())}>
			<ContentStyle />
			<KatexStyle />
			<TranslatorHost />
			<PopupRenderer />
			<TipRenderer />
			<ProgressIndicator />
		</div>
	);
};

export default () => {
	return (
		<SettingsProvider>
			<ProgressIndicatorProvider>
				<PopupProvider>
					<WebsiteRuleProvider>
						<Content />
					</WebsiteRuleProvider>
				</PopupProvider>
			</ProgressIndicatorProvider>
		</SettingsProvider>
	);
};
