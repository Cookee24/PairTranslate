import { Button } from "~/components/Button";
import { FormGrid } from "~/components/settings/FormGrid";
import { NumberInput } from "~/components/settings/NumberInput";
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

const descKeyForField = (
	field: keyof QueueOverride,
):
	| "settings.flowControl.requestConcurrencyDesc"
	| "settings.flowControl.tokensPerMinuteDesc"
	| "settings.flowControl.maxBatchSizeDesc"
	| "settings.flowControl.maxTokensPerBatchDesc" => {
	if (field === "requestConcurrency") {
		return "settings.flowControl.requestConcurrencyDesc";
	}
	if (field === "tokensPerMinute") {
		return "settings.flowControl.tokensPerMinuteDesc";
	}
	if (field === "maxTokensPerBatch") {
		return "settings.flowControl.maxTokensPerBatchDesc";
	}
	return "settings.flowControl.maxBatchSizeDesc";
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

	const helperText = (field: keyof QueueOverride) => {
		const defaultValue = props.defaults[field] ?? 0;
		return `${t(descKeyForField(field))} (${t("common.globalDefault")}: ${defaultValue})`;
	};

	const getValue = (field: keyof QueueOverride) => props.value?.[field] ?? "";

	return (
		<div class="space-y-3">
			<div class="flex items-start justify-between gap-2">
				<div>
					<p class="text-sm font-semibold">
						{t("settings.services.flowControl.title")}
					</p>
					<p class="text-xs text-base-content/70">
						{t("settings.services.flowControl.description")}
					</p>
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
			<FormGrid cols={2} gap="md">
				{fieldKeys.map((field) => (
					<NumberInput
						label={t(labelKeyForField(field))}
						helperText={helperText(field)}
						value={getValue(field)}
						min={fieldConstraints[field].min}
						max={fieldConstraints[field].max}
						step={fieldConstraints[field].step}
						placeholder={String(props.defaults[field])}
						onChange={(e) => updateQueueField(field, e.currentTarget.value)}
					/>
				))}
			</FormGrid>
		</div>
	);
};
