import { Route, Router, useLocation, useNavigate } from "@solidjs/router";
import { Earth, ExternalLink, Settings2 } from "lucide-solid";
import type { JSX } from "solid-js";
import Overall from "./pages/Overall";
import Website from "./pages/Website";

const Content = (props: { children?: JSX.Element }) => {
	const navigate = useNavigate();
	const location = useLocation();

	return (
		<div class="p-4 flex flex-col gap-4 w-full h-full">
			{props.children}
			<div class="flex-1" />
			<div class="self-end">
				{location.pathname.includes("/website") ? (
					<Button variant="ghost" on:click={() => navigate("/")}>
						<Settings2 size={16} />
						常规设置
					</Button>
				) : (
					<Button variant="ghost" on:click={() => navigate("/website")}>
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

export default () => {
	return (
		<SettingsProvider>
			<Router root={Content}>
				<Route path="/*" component={Overall} />
				<Route path="/website" component={Website} />
			</Router>
		</SettingsProvider>
	);
};
