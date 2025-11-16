import { HashRouter, Route, useLocation, useNavigate } from "@solidjs/router";
import { Earth, ExternalLink, Settings2 } from "lucide-solid";
import type { JSX } from "solid-js";
import Overall from "./pages/Overall";
import Website from "./pages/Website";

const Content = (props: { children?: JSX.Element }) => {
	const navigate = useNavigate();
	const location = useLocation();

	browser.tabs
		.query({ active: true, currentWindow: true })
		.then((tabs) => new URL(tabs[0]?.url || "").hostname)
		.then((hostname) => window.rpc.matchWebsiteRule(hostname))
		.then((idx) => (idx === null ? navigate("overall") : navigate("website")));

	return (
		<div class="p-4 flex flex-col gap-4 w-full h-full">
			<div class="flex-1 overflow-y-auto">{props.children}</div>
			<div class="self-end">
				{location.pathname.includes("website") ? (
					<Button variant="ghost" on:click={() => navigate("overall")}>
						<Settings2 size={16} />
						常规设置
					</Button>
				) : (
					<Button variant="ghost" on:click={() => navigate("website")}>
						<Earth size={16} />
						网站设置
					</Button>
				)}
				<Button
					variant="ghost"
					class="self-end"
					on:click={() => browser.runtime.openOptionsPage()}
				>
					<ExternalLink size={16} />
					更多设置
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
