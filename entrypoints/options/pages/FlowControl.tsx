import { trackStore } from "@solid-primitives/deep";
import { createEffect, createSignal, on } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import type z from "zod";
import { FormGrid } from "~/components/settings/FormGrid";
import { NumberInput } from "~/components/settings/NumberInput";
import { SettingsCard } from "~/components/settings/SettingsCard";
import { useSettings } from "~/hooks/settings";
import { t } from "~/utils/i18n";
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

	return (
		<SettingsCard title={t("settings.flowControl.title")} navId={props.navId}>
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
					value={localQueue.maxBatchSize}
					onChange={(e) =>
						setLocalQueue("maxBatchSize", Number(e.target.value))
					}
				/>

				<NumberInput
					label={t("settings.flowControl.cacheSize")}
					helperText={t("settings.flowControl.cacheSizeDesc")}
					error={getFieldError(["cacheSize"])?.message}
					min={0}
					max={50000}
					value={localQueue.cacheSize}
					onChange={(e) => setLocalQueue("cacheSize", Number(e.target.value))}
				/>
			</FormGrid>
		</SettingsCard>
	);
};
