import { type Component, For } from "solid-js";
import { Stats } from "~/components/Stats";
import { cn } from "~/utils/cn";
import { t } from "~/utils/i18n";
import type { QueueControlSettings, QueueOverride } from "~/utils/settings/def";

interface QueueSummaryProps {
	queue?: QueueOverride;
	defaults: QueueControlSettings;
	class?: string;
}

const fields: Array<{ key: keyof QueueOverride }> = [
	{ key: "requestConcurrency" },
	{ key: "tokensPerMinute" },
	{ key: "maxBatchSize" },
	{ key: "maxTokensPerBatch" },
];

const labelKeyForField = (
	field: keyof QueueOverride,
):
	| "settings.flowControl.requestConcurrency"
	| "settings.flowControl.tokensPerMinute"
	| "settings.flowControl.maxBatchSize"
	| "settings.flowControl.maxTokensPerBatch" => {
	if (field === "requestConcurrency") {
		return "settings.flowControl.requestConcurrency";
	}
	if (field === "tokensPerMinute") {
		return "settings.flowControl.tokensPerMinute";
	}
	if (field === "maxTokensPerBatch") {
		return "settings.flowControl.maxTokensPerBatch";
	}
	return "settings.flowControl.maxBatchSize";
};

export const QueueSummary: Component<QueueSummaryProps> = (props) => {
	const metrics = fields.map((field) => {
		const overrideValue = props.queue?.[field.key];
		const fallback = props.defaults[field.key];
		const value =
			overrideValue !== undefined
				? overrideValue
				: fallback !== undefined
					? fallback
					: "-";
		return {
			key: field.key,
			label: t(labelKeyForField(field.key)),
			value,
			isOverride: overrideValue !== undefined,
		};
	});

	const formatValue = (value: number | string) =>
		typeof value === "number" ? value.toLocaleString() : value;

	return (
		<div class={cn("mt-4", props.class)}>
			<p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
				{t("settings.services.flowControl.title")}
			</p>
			<Stats.Root
				responsive
				shadow={false}
				class="w-full border border-base-300 bg-base-200/70"
			>
				<For each={metrics}>
					{(metric) => (
						<Stats.Stat centered class="px-4 py-3">
							<Stats.Title class="stat-title text-xs uppercase tracking-wide text-base-content/60">
								{metric.label}
							</Stats.Title>
							<Stats.Value
								class={cn("text-lg", metric.isOverride && "text-primary")}
							>
								{formatValue(metric.value)}
							</Stats.Value>
							{!metric.isOverride && (
								<Stats.Desc class="text-[11px] text-base-content/60">
									{t("common.globalDefault")}
								</Stats.Desc>
							)}
						</Stats.Stat>
					)}
				</For>
			</Stats.Root>
		</div>
	);
};
