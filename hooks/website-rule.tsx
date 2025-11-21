import {
	createContext,
	createEffect,
	createSignal,
	type JSX,
	on,
	Show,
	useContext,
} from "solid-js";
import { createStore, type Store } from "solid-js/store";
import { useSettings } from "~/hooks/settings";
import type { WebsiteRuleSettings } from "~/utils/settings";

type WebsiteRuleContextType = Store<WebsiteRuleSettings> | undefined;
const WebsiteRuleContext = createContext<WebsiteRuleContextType>();

export function WebsiteRuleProvider(props: { children: JSX.Element }) {
	const { settings } = useSettings();

	const [websiteRule, setWebsiteRule] = createStore<WebsiteRuleSettings>({
		urlPatterns: [],
	});
	const [idx, setIdx] = createSignal<number | null>(null);
	const [initialized, setInitialized] = createSignal(false);
	const domain = window.location.hostname;

	const fetchOnce = () => window.rpc.matchWebsiteRule(domain).then(setIdx);

	createEffect(async () => {
		const idx_ = idx();
		if (idx_ === null) return;
		createEffect(
			on(
				[
					() => settings.websiteRules.length,
					() => Object.values(settings.websiteRules[idx_]).forEach(() => {}),
				],
				fetchOnce,
				{ defer: true },
			),
		);
		setWebsiteRule(settings.websiteRules[idx_]);
	});

	fetchOnce().then(() => setInitialized(true));

	return (
		<WebsiteRuleContext.Provider value={websiteRule}>
			<Show when={initialized()}>{props.children}</Show>
		</WebsiteRuleContext.Provider>
	);
}

export function useWebsiteRule() {
	const context = useContext(WebsiteRuleContext);
	if (!context) {
		throw new Error("useWebsiteRule must be used within a WebsiteRuleProvider");
	}
	return context;
}
