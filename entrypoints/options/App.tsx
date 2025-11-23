import { HashRouter, Navigate, Route } from "@solidjs/router";
import {
	Activity,
	BrainCircuit,
	Cog,
	FileText,
	Globe,
	Info,
	Languages,
	MessageSquare,
} from "lucide-solid";
import {
	createEffect,
	createSignal,
	type JSX,
	onCleanup,
	onMount,
} from "solid-js";
import { SettingsRecoveryBanner } from "~/components/SettingsRecoveryBanner";
import { SettingsProvider, useSettings } from "~/hooks/settings";
import { t } from "~/utils/i18n";
import { getThemeClass } from "~/utils/theme";
import Nav from "./components/Nav";
import About from "./pages/About";
import Advanced from "./pages/Advanced";
import Basic from "./pages/Basic";
import FlowControl from "./pages/FlowControl";
import LLM from "./pages/LLM";
import Prompt from "./pages/Prompt";
import PromptSettings from "./pages/PromptSettings";
import Traditional from "./pages/Traditional";
import Translation from "./pages/Translation";
import WebsiteRules from "./pages/WebsiteRules";

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

	return <div class="min-h-screen">{props.children}</div>;
};

const SettingsPage = () => {
	const [top, setTop] = createSignal(8);

	let ref: HTMLDivElement | undefined;
	onMount(() => {
		if (!ref) return;
		const handler = (height: number) => {
			setTop(height + 48);
		};

		handler(ref.offsetHeight);
		window.addEventListener("resize", () => handler(ref.offsetHeight));
		onCleanup(() =>
			window.removeEventListener("resize", () => handler(ref.offsetHeight)),
		);
	});

	return (
		<>
			<Nav.Root ref={ref}>
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
				<Nav.Item navId="about">
					<Info size={16} />
					{t("nav.about")}
				</Nav.Item>
			</Nav.Root>
			<div
				class="max-w-156 mx-auto px-4 flex flex-col gap-8 pb-16"
				style={{
					"margin-top": `${top()}px`,
				}}
			>
				<SettingsRecoveryBanner />
				<Basic navId="basic" />
				<Translation navId="translate" />
				<LLM navId="llm" />
				<PromptSettings navId="promptSettings" />
				<Traditional navId="traditional" />
				<FlowControl navId="flowControl" />
				<WebsiteRules navId="websiteRules" />
				<Advanced navId="advanced" />
				<About navId="about" />
			</div>
		</>
	);
};

export default () => {
	return (
		<SettingsProvider>
			<HashRouter root={OptionsRoot}>
				<Route path="" component={() => <Navigate href="/settings" />} />
				<Route path="/settings" component={SettingsPage} />
				<Route path="/prompt" component={Prompt} />
				<Route path="*" component={() => <Navigate href="/settings" />} />
			</HashRouter>
		</SettingsProvider>
	);
};
