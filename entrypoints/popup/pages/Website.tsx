import { CheckCheck, Link, Plus, Trash2 } from "lucide-solid";
import { WebsiteRuleEditor } from "~/components/website-rule/Editor";
import type { WebsiteRuleSettings } from "~/utils/settings";

export default () => {
	const { settings, setSettings } = useSettings();
	const [domain, setDomain] = createSignal<string>();
	const [rule, setRule] = createSignal<WebsiteRuleSettings>();
	const [idx, setIdx] = createSignal<number>();

	browser.tabs
		.query({ active: true, currentWindow: true })
		.then((tabs) => new URL(tabs[0]?.url || "").hostname)
		.then((hostname) => setDomain(hostname));

	createEffect(
		on(
			() => domain(),
			async (domain) => {
				if (!domain) return;

				const idx = await window.rpc.matchWebsiteRule(domain);
				if (idx !== null) {
					setRule(settings.websiteRules[idx]);
					setIdx(idx);
				} else {
					const patterns: string[] = [];
					const domainParts = domain.split(".");
					switch (domainParts.length) {
						case 0:
							break;
						case 1:
							patterns.push(domain);
							break;
						case 2:
							patterns.push(domain);
							patterns.push(`*.${domain}`);
							break;
						default:
							patterns.push(domain);
							patterns.push(`*.${domainParts.slice(-2).join(".")}`);
							break;
					}

					setRule({
						urlPatterns: patterns,
					});
				}
			},
			{ defer: true },
		),
	);

	createEffect(
		on(
			[rule, idx],
			([r, i]) => {
				if (r && i !== undefined) {
					console.log("Updating existing rule at index", i);
					setSettings("websiteRules", i, r);
				}
			},
			{ defer: true },
		),
	);

	return (
		<>
			<div class="w-full p-4 flex items-center gap-2">
				<Link size={16} />
				<span class="font-mono overflow-clip">{domain()}</span>
				<Button
					class="tooltip tooltip-left ml-auto"
					variant="success"
					size="xs"
					data-tip="添加规则"
					onClick={() => {
						if (idx() !== undefined) return;
						const newIdx = settings.websiteRules.length;
						const rule_ = rule();
						if (!rule_) return;

						setSettings("websiteRules", newIdx, rule_);
						setIdx(newIdx);
					}}
					disabled={idx() !== undefined}
				>
					{idx() === undefined ? <Plus size={16} /> : <CheckCheck size={16} />}
				</Button>
				<Button
					class="tooltip tooltip-left"
					variant="warning"
					size="xs"
					data-tip="删除规则"
					onClick={() => {
						const idx_ = idx();
						if (idx_ === undefined) return;
						setSettings("websiteRules", (prev) =>
							prev.filter((_, i) => i !== idx_),
						);
						setIdx(undefined);
					}}
					disabled={idx() === undefined}
				>
					<Trash2 size={16} />
				</Button>
			</div>
			<Show when={rule()}>
				{(r) => <WebsiteRuleEditor s={untrack(r)} onChange={setRule} />}
			</Show>
		</>
	);
};
