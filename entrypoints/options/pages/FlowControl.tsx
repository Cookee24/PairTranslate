import { trackStore } from "@solid-primitives/deep";
import { Gauge, Layers, Package, Users, Warehouse } from "lucide-solid";
import { createEffect, createSignal, on } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import type z from "zod";
import { FormGrid } from "~/components/settings/FormGrid";
import { NumberInput } from "~/components/settings/NumberInput";
import { SectionResetButton } from "~/components/settings/SectionResetButton";
import { SettingsCard } from "~/components/settings/SettingsCard";
import { useSettings } from "~/hooks/settings";
import { t } from "~/utils/i18n";
import { generateQueueControlSettings } from "~/utils/settings";
import * as s from "~/utils/settings/def";

export default (props: { navId: string }) => {
	const { settings, setSettings } = useSettings();
	const [localQueue, setLocalQueue] = createStore(settings.queue);

	const [validationErrors, setValidationErrors] =
		createSignal<z.ZodError | null>(null);

	createEffect(
		on(
			() => unwrap(trackStore(localQueue)),
			(current) => {
				const result = s.QueueControlSettings.safeParse(current);
				if (!result.success) {
					setValidationErrors(result.error);
					return;
				}

				setValidationErrors(null);
				setSettings("queue", reconcile(result.data));
			},
			{ defer: true },
		),
	);

	const getFieldError = (fieldPath: string[]) => {
		if (!validationErrors()) return null;
		return validationErrors()?.issues.find(
			(issue) =>
				issue.path.length === fieldPath.length &&
				issue.path.every((segment, index) => segment === fieldPath[index]),
		);
	};

	const handleReset = () => {
		const defaults = generateQueueControlSettings();
		setLocalQueue(reconcile(defaults));
	};

	return (
		<SettingsCard
			title={t("settings.flowControl.title")}
			navId={props.navId}
			actions={<SectionResetButton onReset={handleReset} />}
		>
			<p class="text-sm text-base-content/70 mb-4">
				{t("settings.flowControl.description")}
			</p>
			<FormGrid gap="lg">
				<NumberInput
					label={t("settings.flowControl.requestConcurrency")}
					helperText={t("settings.flowControl.requestConcurrencyDesc")}
					error={getFieldError(["requestConcurrency"])?.message}
					min={1}
					max={64}
					icon={<Users size={16} />}
					suffix="req"
					value={localQueue.requestConcurrency}
					onChange={(e) =>
						setLocalQueue("requestConcurrency", Number(e.target.value))
					}
				/>

				<NumberInput
					label={t("settings.flowControl.tokensPerMinute")}
					helperText={t("settings.flowControl.tokensPerMinuteDesc")}
					error={getFieldError(["tokensPerMinute"])?.message}
					min={1}
					step={1000}
					icon={<Gauge size={16} />}
					suffix="tpm"
					value={localQueue.tokensPerMinute}
					onChange={(e) =>
						setLocalQueue("tokensPerMinute", Number(e.target.value))
					}
				/>

				<NumberInput
					label={t("settings.flowControl.maxBatchSize")}
					helperText={t("settings.flowControl.maxBatchSizeDesc")}
					error={getFieldError(["maxBatchSize"])?.message}
					min={1}
					max={100}
					icon={<Layers size={16} />}
					suffix="req"
					value={localQueue.maxBatchSize}
					onChange={(e) =>
						setLocalQueue("maxBatchSize", Number(e.target.value))
					}
				/>

				<NumberInput
					label={t("settings.flowControl.maxTokensPerBatch")}
					helperText={t("settings.flowControl.maxTokensPerBatchDesc")}
					error={getFieldError(["maxTokensPerBatch"])?.message}
					min={1}
					max={200000}
					step={100}
					icon={<Package size={16} />}
					suffix="tokens"
					value={localQueue.maxTokensPerBatch}
					onChange={(e) =>
						setLocalQueue("maxTokensPerBatch", Number(e.target.value))
					}
				/>

				<NumberInput
					label={t("settings.flowControl.cacheSize")}
					helperText={t("settings.flowControl.cacheSizeDesc")}
					error={getFieldError(["cacheSize"])?.message}
					min={0}
					max={50000}
					icon={<Warehouse size={16} />}
					suffix="items"
					value={localQueue.cacheSize}
					onChange={(e) => setLocalQueue("cacheSize", Number(e.target.value))}
				/>
			</FormGrid>
		</SettingsCard>
	);
};
