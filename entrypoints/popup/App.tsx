import { HashRouter, Route, useLocation, useNavigate } from "@solidjs/router";
import {
	Earth,
	ExternalLink,
	LayoutPanelLeft,
	Power,
	PowerOff,
	Settings2,
} from "lucide-solid";
import type { JSX } from "solid-js";
import { createEffect, createMemo, Match, Switch } from "solid-js";
import { browser } from "#imports";
import { getThemeClass } from "@/utils/theme";
import { Button } from "~/components/Button";
import { Loading } from "~/components/Loading";
import { SettingsRecoveryBanner } from "~/components/SettingsRecoveryBanner";
import { SettingsProvider, useSettings } from "~/hooks/settings";
import { createTheme } from "~/hooks/theme";
import { t } from "~/utils/i18n";
import { getCurrentDomain } from "./get-current";
import Overall from "./pages/Overall";
import Website from "./pages/Website";

const Content = (props: { children?: JSX.Element }) => {
	const { settings, setSettings } = useSettings();
	const enabled = createMemo(() => settings.basic.enabled);

	const navigate = useNavigate();
	const location = useLocation();

	getCurrentDomain()
		.then((hostname) => window.rpc.matchWebsiteRule(hostname))
		.then((idx) => (idx === null ? navigate("overall") : navigate("website")));

	const theme = createTheme();
	createEffect(() => {
		document.documentElement.setAttribute(
			"data-theme",
			getThemeClass(theme()) || "",
		);
	});

	const openTranslatorPopup = () => {
		browser.windows.create({
			type: "popup",
			url: browser.runtime.getURL("/translator.html"),
			width: 420,
			height: 640,
		});
	};

	return (
		<div class="p-4 flex flex-col gap-4 w-full h-full">
			<div class="flex-1 overflow-y-auto flex flex-col gap-4">
				<SettingsRecoveryBanner />
				{props.children}
			</div>
			<div class="flex gap-2">
				<Button
					class="btn-circle tooltip tooltip-right z-2"
					size="sm"
					variant={enabled() ? "primary" : "neutral"}
					on:click={() => setSettings("basic", "enabled", !enabled())}
					data-tip={enabled() ? t("common.enabled") : t("common.disabled")}
				>
					{enabled() ? <Power size={16} /> : <PowerOff size={16} />}
				</Button>
				<Button
					class="btn-circle mr-auto tooltip tooltip-right z-1"
					size="sm"
					variant="ghost"
					on:click={openTranslatorPopup}
					data-tip={t("popup.navigation.openTranslatorWindow")}
				>
					<LayoutPanelLeft size={16} />
				</Button>
				<Switch>
					<Match when={location.pathname.includes("overall")}>
						<Button variant="ghost" on:click={() => navigate("website")}>
							<Earth size={16} />
							{t("nav.websiteRules")}
						</Button>
					</Match>
					<Match when={location.pathname.includes("website")}>
						<Button variant="ghost" on:click={() => navigate("overall")}>
							<Settings2 size={16} />
							{t("nav.basic")}
						</Button>
					</Match>
				</Switch>
				<Button
					variant="ghost"
					on:click={() => browser.runtime.openOptionsPage()}
				>
					<ExternalLink size={16} />
					{t("popup.navigation.openOptions")}
				</Button>
			</div>
		</div>
	);
};

const FullScreenLoading = () => (
	<div class="w-full h-full flex items-center justify-center">
		<Loading size="xl" />
	</div>
);

export default () => {
	return (
		<SettingsProvider>
			<HashRouter root={Content}>
				<Route path="" component={FullScreenLoading} />
				<Route path="overall" component={Overall} />
				<Route path="website" component={Website} />
			</HashRouter>
		</SettingsProvider>
	);
};
