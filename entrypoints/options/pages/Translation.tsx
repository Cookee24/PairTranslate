import { trackStore } from "@solid-primitives/deep";
import { unwrap } from "solid-js/store";
import type z from "zod";
import { ButtonGroup } from "~/components/settings/ButtonGroup";
import { FormGrid } from "~/components/settings/FormGrid";
import { NumberInput } from "~/components/settings/NumberInput";
import {
	OptionSelect,
	type SelectOption,
} from "~/components/settings/OptionSelect";
import { SettingsCard } from "~/components/settings/SettingsCard";
import { SettingsCheckbox } from "~/components/settings/SettingsCheckbox";
import * as s from "~/utils/settings/def";
import { selectServicesByType } from "~/utils/settings/services";

export default (props: { navId: string }) => {
	const { settings, setSettings } = useSettings();
	const [localSettings, setLocalSettings] = createStore(settings.translate);

	const [lLMOptions, setLLMOptions] = createSignal<SelectOption[]>([]);
	const [allOptions, setAllOptions] = createSignal<SelectOption[]>([]);

	const [validationErrors, setValidationErrors] =
		createSignal<z.ZodError | null>(null);

	createEffect(
		on(
			() => unwrap(trackStore(localSettings)),
			(current) => {
				const result = s.TranslateSettings.safeParse(current);
				if (!result.success) {
					setValidationErrors(result.error);
				} else {
					setValidationErrors(null);
					setSettings("translate", reconcile(result.data));
				}
			},
			{ defer: true },
		),
	);

	createEffect(() => {
		trackStore(settings.services);
		const services = unwrap(settings.services);
		const llmServices = selectServicesByType(services, "llm");
		const traditionalServices = selectServicesByType(services, "traditional");

		const options: SelectOption[] = [
			{ value: "", label: t("settings.translation.noModel"), disabled: false },
		];
		const lLMOptions = [...options];

		Object.entries(llmServices).forEach(([uuid, service]) => {
			lLMOptions.push({
				value: uuid,
				label: service.name,
				disabled: false,
			});
		});

		const allOptions = [...lLMOptions];

		Object.entries(traditionalServices).forEach(([uuid, service]) => {
			allOptions.push({
				value: uuid,
				label: service.name,
				disabled: false,
			});
		});

		setLLMOptions(lLMOptions);
		setAllOptions(allOptions);
	});

	const getFieldError = (fieldPath: string[]) => {
		if (!validationErrors()) return null;
		return validationErrors()?.issues.find(
			(issue) =>
				issue.path.length === fieldPath.length &&
				issue.path.every((segment, index) => segment === fieldPath[index]),
		);
	};

	const sourceLanguageOptions = createMemo<SelectOption[]>(() => [
		{ value: "auto", label: t("settings.translation.autoDetect") },
		...SUPPORTED_LANGUAGES.map((lang) => ({
			value: lang.code,
			label: lang.nativeName,
		})),
	]);

	const targetLanguageOptions = createMemo<SelectOption[]>(() =>
		SUPPORTED_LANGUAGES.map((lang) => ({
			value: lang.code,
			label: lang.nativeName,
		})),
	);

	return (
		<SettingsCard title={t("settings.translation.title")} navId={props.navId}>
			<FormGrid gap="lg">
				<NumberInput
					label={t("settings.translation.concurrentRequests")}
					helperText={t("settings.translation.concurrentRequestsDesc")}
					error={getFieldError(["concurrentRequests"])?.message}
					min={1}
					max={32}
					value={localSettings.concurrentRequests}
					onChange={(e) =>
						setLocalSettings("concurrentRequests", Number(e.target.value))
					}
				/>

				<NumberInput
					label={t("settings.translation.cacheSize")}
					helperText={t("settings.translation.cacheSizeDesc")}
					error={getFieldError(["cacheSize"])?.message}
					min={0}
					max={10000}
					value={localSettings.cacheSize}
					onChange={(e) =>
						setLocalSettings("cacheSize", Number(e.target.value))
					}
				/>

				<NumberInput
					label={t("settings.translation.maxBatchSize")}
					helperText={t("settings.translation.maxBatchSizeDesc")}
					error={getFieldError(["maxBatchSize"])?.message}
					min={1}
					max={100}
					value={localSettings.maxBatchSize}
					onChange={(e) =>
						setLocalSettings("maxBatchSize", Number(e.target.value))
					}
				/>
			</FormGrid>
			<div class="divider m-0" />
			<FormGrid gap="lg">
				<OptionSelect
					label={t("settings.translation.sourceLanguage")}
					options={sourceLanguageOptions()}
					value={localSettings.sourceLang}
					onChange={(e) => setLocalSettings("sourceLang", e.target.value)}
				/>

				<OptionSelect
					label={t("settings.translation.targetLanguage")}
					options={targetLanguageOptions()}
					value={localSettings.targetLang}
					onChange={(e) => setLocalSettings("targetLang", e.target.value)}
				/>

				<div class="form-control">
					<label class="label">
						<span class="label-text">
							{t("settings.translation.translationMode")}
						</span>
					</label>
					<ButtonGroup
						options={[
							{
								value: "parallel",
								label: t("settings.translation.modeParallel"),
							},
							{
								value: "replace",
								label: t("settings.translation.modeReplace"),
							},
						]}
						value={localSettings.translationMode}
						onChange={(value) =>
							setLocalSettings(
								"translationMode",
								value as "parallel" | "replace",
							)
						}
						title={t("settings.translation.translationModeDesc")}
					/>
					<br />
					<label class="label">
						<span class="label-text-alt text-xs">
							{t("settings.translation.translationModeDesc")}
						</span>
					</label>
				</div>

				<SettingsCheckbox
					label={t("settings.translation.filterInteractive")}
					helperText={t("settings.translation.filterInteractiveDesc")}
					checked={localSettings.filterInteractive}
					onChange={(e) =>
						setLocalSettings("filterInteractive", e.target.checked)
					}
				/>

				<SettingsCheckbox
					label={t("settings.translation.translateFullPage")}
					helperText={t("settings.translation.translateFullPageDesc")}
					checked={localSettings.translateFullPage}
					onChange={(e) =>
						setLocalSettings("translateFullPage", e.target.checked)
					}
				/>
			</FormGrid>
			<div class="divider m-0" />
			<FormGrid gap="lg">
				<OptionSelect
					label={t("settings.translation.inTextTranslateModel")}
					options={allOptions()}
					value={localSettings.inTextTranslateModel || ""}
					error={getFieldError(["inTextTranslateModel"])?.message}
					onChange={(e) => {
						const value = e.target.value === "" ? undefined : e.target.value;
						setLocalSettings("inTextTranslateModel", value);
					}}
				/>

				<OptionSelect
					label={t("settings.translation.floatingTranslateModel")}
					options={allOptions()}
					value={localSettings.floatingTranslateModel || ""}
					error={getFieldError(["floatingTranslateModel"])?.message}
					onChange={(e) => {
						const value = e.target.value === "" ? undefined : e.target.value;
						setLocalSettings("floatingTranslateModel", value);
					}}
				/>

				<OptionSelect
					label={t("settings.translation.floatingExplainModel")}
					options={lLMOptions()}
					value={localSettings.floatingExplainModel || ""}
					error={getFieldError(["floatingExplainModel"])?.message}
					onChange={(e) => {
						const value = e.target.value === "" ? undefined : e.target.value;
						setLocalSettings("floatingExplainModel", value);
					}}
				/>

				<OptionSelect
					label={t("settings.translation.inputTranslateModel")}
					options={allOptions()}
					value={localSettings.inputTranslateModel || ""}
					error={getFieldError(["inputTranslateModel"])?.message}
					onChange={(e) => {
						const value = e.target.value === "" ? undefined : e.target.value;
						setLocalSettings("inputTranslateModel", value);
					}}
				/>
			</FormGrid>
		</SettingsCard>
	);
};
