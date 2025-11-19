import { type Component, For, Show } from "solid-js";
import type { QueueControlSettings, QueueOverride } from "~/utils/settings/def";

interface QueueSummaryProps {
	queue?: QueueOverride;
	defaults: QueueControlSettings;
}

const fields: Array<{ key: keyof QueueOverride }> = [
	{ key: "requestConcurrency" },
	{ key: "tokensPerMinute" },
	{ key: "maxBatchSize" },
];

const labelKeyForField = (
	field: keyof QueueOverride,
):
	| "settings.flowControl.requestConcurrency"
	| "settings.flowControl.tokensPerMinute"
	| "settings.flowControl.maxBatchSize" => {
	if (field === "requestConcurrency") {
		return "settings.flowControl.requestConcurrency";
	}
	if (field === "tokensPerMinute") {
		return "settings.flowControl.tokensPerMinute";
	}
	return "settings.flowControl.maxBatchSize";
};

export const QueueSummary: Component<QueueSummaryProps> = (props) => {
	return (
		<div class="mt-3 border-t border-base-200 pt-3 text-xs">
			<p class="text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
				{t("settings.services.flowControl.title")}
			</p>
			<Show
				when={props.queue}
				fallback={
					<p class="mt-1 text-base-content/60">
						{t("settings.services.flowControl.usingGlobal")}
					</p>
				}
			>
				<ul class="mt-1 space-y-1 text-base-content/70">
					<For each={fields}>
						{(field) => {
							const overrideValue = props.queue?.[field.key];
							const value =
								overrideValue !== undefined
									? overrideValue
									: (props.defaults[field.key] ?? "-");
							return (
								<li class="flex items-center justify-between gap-3">
									<span>{t(labelKeyForField(field.key))}</span>
									<span
										class={
											overrideValue !== undefined
												? "text-primary font-semibold"
												: ""
										}
									>
										{value}
										{overrideValue === undefined && (
											<span class="text-base-content/60">
												{` (${t("common.globalDefault")})`}
											</span>
										)}
									</span>
								</li>
							);
						}}
					</For>
				</ul>
			</Show>
		</div>
	);
};
