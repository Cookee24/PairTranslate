import { trackDeep } from "@solid-primitives/deep";
import {
	createContext,
	createEffect,
	createSignal,
	type JSX,
	on,
	Show,
	useContext,
} from "solid-js";
import { createStore, reconcile, type Store } from "solid-js/store";
import { useSettings } from "~/hooks/settings";
import type { WebsiteRuleSettings } from "~/utils/settings";

type WebsiteRuleContextType = Store<WebsiteRuleSettings> | undefined;
const WebsiteRuleContext = createContext<WebsiteRuleContextType>();

export function WebsiteRuleProvider(props: { children: JSX.Element }) {
	const { settings } = useSettings();

	const [websiteRule, setWebsiteRule] = createStore<WebsiteRuleSettings>({
		urlPatterns: [],
	});
	const [idx, setIdx] = createSignal<number | null>(null, { equals: false });
	const [initialized, setInitialized] = createSignal(false);
	const domain = window.location.hostname;

	const fetchOnce = () => window.rpc.matchWebsiteRule(domain).then(setIdx);

	createEffect(
		on(
			idx,
			(idx_) => {
				createEffect(
					on(
						[
							() => settings.websiteRules.length,
							() => idx_ !== null && trackDeep(settings.websiteRules[idx_]),
						],
						async () => {
							// Hacky way to ensure background has updated its cache
							await new Promise((r) => setTimeout(r, 200));
							fetchOnce();
						},
						{ defer: true },
					),
				);
				idx_ === null
					? setWebsiteRule(reconcile({ urlPatterns: [] }))
					: setWebsiteRule(reconcile(settings.websiteRules[idx_]));
			},
			{ defer: true },
		),
	);

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
