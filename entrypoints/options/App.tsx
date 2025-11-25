import { HashRouter, Navigate, Route } from "@solidjs/router";
import {
	Activity,
	BrainCircuit,
	Bug,
	Cog,
	FileText,
	Globe,
	Info,
	Languages,
	Menu as MenuIcon,
	MessageSquare,
} from "lucide-solid";
import {
	createEffect,
	createMemo,
	createSignal,
	type JSX,
	lazy,
} from "solid-js";
import { SettingsRecoveryBanner } from "~/components/SettingsRecoveryBanner";
import { SettingsProvider, useSettings } from "~/hooks/settings";
import { t } from "~/utils/i18n";
import { getThemeClass } from "~/utils/theme";
import Nav from "./components/Nav";
import About from "./pages/About";
import Advanced from "./pages/Advanced";
import Basic from "./pages/Basic";
import Debug from "./pages/Debug";
import FlowControl from "./pages/FlowControl";
import LLM from "./pages/LLM";
import PromptSettings from "./pages/PromptSettings";
import Traditional from "./pages/Traditional";
import Translation from "./pages/Translation";
import WebsiteRules from "./pages/WebsiteRules";

const PromptPage = lazy(() => import("./pages/Prompt"));

const OptionsRoot = (props: { children?: JSX.Element }) => {
	const { settings } = useSettings();

	createEffect(() => {
		const body = document.body;
		const theme = getThemeClass(settings.basic.theme);
		body.removeAttribute("data-theme");
		if (theme) {
			body.setAttribute("data-theme", theme);
		}
	});

	return (
		<div class="min-h-screen bg-base-200 text-base-content">
			{props.children}
		</div>
	);
};

const DEBUG_TAPS_REQUIRED = 5;

const SettingsPage = () => {
	const [debugTapCount, setDebugTapCount] = createSignal(0);
	const isDevBuild = import.meta.env.DEV;
	const debugVisible = createMemo(
		() => isDevBuild || debugTapCount() >= DEBUG_TAPS_REQUIRED,
	);
	const tapsRemaining = createMemo(() =>
		debugVisible() ? 0 : Math.max(0, DEBUG_TAPS_REQUIRED - debugTapCount()),
	);
	const handleDebugIconClick = () => {
		if (debugVisible()) return;
		setDebugTapCount((count) => Math.min(DEBUG_TAPS_REQUIRED, count + 1));
	};

	const drawerId = "settings-nav-drawer";

	return (
		<div class="drawer lg:drawer-open min-h-screen bg-base-200 text-base-content">
			<input id={drawerId} type="checkbox" class="drawer-toggle" />
			<div class="drawer-content flex flex-col gap-6 p-4 lg:p-10">
				<div class="flex items-center justify-between lg:hidden">
					<label
						for={drawerId}
						class="btn btn-square btn-ghost"
						aria-label="Open navigation"
					>
						<MenuIcon size={18} />
					</label>
					<Nav.Status class="bg-base-100/90 border border-base-200 shadow-sm" />
				</div>
				<div class="w-full max-w-5xl mx-auto flex flex-col gap-6 pb-16">
					<SettingsRecoveryBanner />
					<Basic navId="basic" />
					<Translation navId="translate" />
					<LLM navId="llm" />
					<PromptSettings navId="promptSettings" />
					<Traditional navId="traditional" />
					<FlowControl navId="flowControl" />
					<WebsiteRules navId="websiteRules" />
					<Advanced navId="advanced" />
					{debugVisible() && <Debug navId="debug" />}
					<About
						navId="about"
						onRevealDebug={handleDebugIconClick}
						debugVisible={debugVisible}
						debugTapsRemaining={tapsRemaining}
					/>
				</div>
			</div>
			<Nav.Root drawerId={drawerId}>
				<Nav.Item navId="basic">
					<Info size={16} />
					{t("nav.basic")}
				</Nav.Item>
				<Nav.Item navId="translate">
					<Languages size={16} />
					{t("nav.translation")}
				</Nav.Item>
				<Nav.Item navId="llm">
					<BrainCircuit size={16} />
					{t("nav.llmServices")}
				</Nav.Item>
				<Nav.Item navId="promptSettings">
					<MessageSquare size={16} />
					{t("nav.promptSettings")}
				</Nav.Item>
				<Nav.Item navId="traditional">
					<Globe size={16} />
					{t("nav.traditionalServices")}
				</Nav.Item>
				<Nav.Item navId="flowControl">
					<Activity size={16} />
					{t("nav.flowControl")}
				</Nav.Item>
				<Nav.Item navId="websiteRules">
					<FileText size={16} />
					{t("nav.websiteRules")}
				</Nav.Item>
				<Nav.Item navId="advanced">
					<Cog size={16} />
					{t("nav.advanced")}
				</Nav.Item>
				{debugVisible() && (
					<Nav.Item navId="debug">
						<Bug size={16} />
						{t("nav.debug")}
					</Nav.Item>
				)}
				<Nav.Item navId="about">
					<Info size={16} />
					{t("nav.about")}
				</Nav.Item>
			</Nav.Root>
		</div>
	);
};

export default () => {
	return (
		<SettingsProvider>
			<HashRouter root={OptionsRoot}>
				<Route path="" component={() => <Navigate href="/settings" />} />
				<Route path="/settings" component={SettingsPage} />
				<Route path="/prompt" component={PromptPage} />
				<Route path="/prompt/:promptId" component={PromptPage} />
				<Route path="*" component={() => <Navigate href="/settings" />} />
			</HashRouter>
		</SettingsProvider>
	);
};
