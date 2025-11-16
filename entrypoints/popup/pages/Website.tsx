import { WebsiteRuleEditor } from "~/components/website-rule/Editor";
import type { WebsiteRuleSetting } from "~/utils/settings";

export default () => {
	const { settings } = useSettings();
	const [domain, setDomain] = createSignal<string>();
	const [rule, setRule] = createSignal<WebsiteRuleSetting>();
	const [idx, setIdx] = createSignal<number>();

	browser.tabs
		.query({ active: true, currentWindow: true })
		.then((tabs) => new URL(tabs[0]?.url || "").hostname)
		.then((hostname) => setDomain(hostname));

	createEffect(async () => {
		const domain_ = domain();
		if (!domain_) return;

		const idx = await window.rpc.matchWebsiteRule(domain_);
		if (idx !== null) {
			setRule(settings.websiteRules[idx]);
			setIdx(idx);
		} else {
			const patterns: string[] = [];
			const domainParts = domain_.split(".");
			switch (domainParts.length) {
				case 0:
					break;
				case 1:
					patterns.push(domain_);
					break;
				case 2:
					patterns.push(domain_);
					patterns.push(`*.${domain_}`);
					break;
				default:
					patterns.push(domain_);
					patterns.push(`*.${domainParts.slice(-2).join(".")}`);
					break;
			}

			setRule({
				urlPatterns: patterns,
			});
		}
	});

	return (
		<Show when={rule()}>
			{(r) => <WebsiteRuleEditor s={r()} index={idx()} />}
		</Show>
	);
};
