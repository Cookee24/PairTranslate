import { trackDeep } from "@solid-primitives/deep";
import type { JSX } from "solid-js";
import type { Store } from "solid-js/store";
import type { WebsiteRuleSetting } from "~/utils/settings";

type WebsiteRuleContextType = Store<WebsiteRuleSetting> | undefined;
const WebsiteRuleContext = createContext<WebsiteRuleContextType>();

export function WebsiteRuleProvider(props: { children: JSX.Element }) {
	const { settings } = useSettings();

	const [websiteRule, setWebsiteRule] = createStore<WebsiteRuleSetting>({
		urlPatterns: [],
	});
	const [initialized, setInitialized] = createSignal(false);
	const domain = window.location.hostname;

	createEffect(async () => {
		const websiteRules = trackDeep(settings.websiteRules);

		// Hacky way to ensure settings are loaded in background
		await new Promise((r) => setTimeout(r, 100));

		const matchedRule = await window.rpc.matchWebsiteRule(domain);
		if (matchedRule) {
			setWebsiteRule(reconcile(websiteRules[matchedRule]));
		}

		setInitialized(true);
	});

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
