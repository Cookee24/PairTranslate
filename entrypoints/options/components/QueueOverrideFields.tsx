import { Activity, Layers, Package, Scale, Zap } from "lucide-solid";
import { Button } from "~/components/Button";
import { t } from "~/utils/i18n";
import type { QueueControlSettings, QueueOverride } from "~/utils/settings/def";

export interface QueueOverrideFieldsProps {
	value?: QueueOverride;
	defaults: QueueControlSettings;
	onChange: (value: QueueOverride | undefined) => void;
}

const fieldKeys: Array<keyof QueueOverride> = [
	"requestConcurrency",
	"tokensPerMinute",
	"maxBatchSize",
	"maxTokensPerBatch",
];

const fieldConstraints: Record<
	keyof QueueOverride,
	{ min: number; max?: number; step?: number }
> = {
	requestConcurrency: { min: 1, max: 64 },
	tokensPerMinute: { min: 1, step: 1000 },
	maxBatchSize: { min: 1, max: 100 },
	maxTokensPerBatch: { min: 1, max: 200000, step: 100 },
};

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

export const QueueOverrideFields = (props: QueueOverrideFieldsProps) => {
	const updateQueueField = (field: keyof QueueOverride, value: string) => {
		const trimmed = value.trim();
		const parsed = trimmed === "" ? undefined : Number(trimmed);
		if (parsed !== undefined && Number.isNaN(parsed)) return;

		const next = props.value ? { ...props.value } : {};
		if (parsed === undefined) {
			delete next[field];
		} else {
			next[field] = parsed;
		}

		const hasValues = Object.keys(next).length > 0;
		props.onChange(hasValues ? next : undefined);
	};

	const getValue = (field: keyof QueueOverride) => props.value?.[field] ?? "";

	const iconMap: Record<keyof QueueOverride, typeof Layers> = {
		requestConcurrency: Layers,
		tokensPerMinute: Zap,
		maxBatchSize: Package,
		maxTokensPerBatch: Scale,
	};

	return (
		<div class="space-y-4 rounded-2xl bg-base-200/70 p-4">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<div class="flex items-center gap-2 text-sm font-semibold">
					<Activity size={16} />
					{t("settings.services.flowControl.title")}
				</div>
				<Button
					variant="ghost"
					size="xs"
					onClick={() => props.onChange(undefined)}
					disabled={!props.value}
				>
					{t("settings.services.flowControl.reset")}
				</Button>
			</div>

			<div class="grid gap-4 md:grid-cols-2">
				{fieldKeys.map((field) => {
					const Icon = iconMap[field];
					return (
						<div class="form-control">
							<div class="label pb-1 justify-between">
								<span class="label-text text-xs font-semibold uppercase text-base-content/70">
									{t(labelKeyForField(field))}
								</span>
								<span class="label-text-alt text-[11px] text-base-content/50">
									{t("common.globalDefault")}: {props.defaults[field]}
								</span>
							</div>
							<label class="input input-sm input-bordered flex items-center gap-2">
								<Icon size={14} class="text-base-content/60" />
								<input
									type="number"
									class="grow bg-transparent text-sm"
									value={getValue(field)}
									min={fieldConstraints[field].min}
									max={fieldConstraints[field].max}
									step={fieldConstraints[field].step}
									placeholder={String(props.defaults[field])}
									onChange={(e) =>
										updateQueueField(field, e.currentTarget.value)
									}
								/>
							</label>
						</div>
					);
				})}
			</div>

			<p class="text-center text-[11px] text-base-content/60">
				{t("settings.services.flowControl.usingGlobal")}
			</p>
		</div>
	);
};
