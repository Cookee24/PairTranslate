import { ContentStyle, KatexStyle } from "~/components/Style";
import { ProgressIndicatorProvider } from "~/hooks/progress-indicator";
import { SettingsProvider } from "~/hooks/settings";
import { createThemeClass } from "~/hooks/theme";
import { WebsiteRuleProvider } from "~/hooks/website-rule";
import { getThemeClass } from "~/utils/theme";
import { PopupProvider, PopupRenderer } from "./components/Popup";
import ProgressIndicator from "./components/ProgressIndicator";
import TipRenderer from "./components/TipRenderer";
import TranslatorHost from "./components/TranslatorHost";

const Content = () => {
	// Media query is not supported in shadow DOM, so manually apply theme class
	const theme = createThemeClass();

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
