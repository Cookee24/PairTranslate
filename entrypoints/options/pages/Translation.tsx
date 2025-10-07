import { trackStore } from "@solid-primitives/deep";
import { unwrap } from "solid-js/store";
import type z from "zod";
import { TranslateSettings } from "~/utils/settings";
import { FormGrid } from "../components/settings/FormGrid";
import { NumberInput } from "../components/settings/NumberInput";
import {
	OptionSelect,
	type SelectOption,
} from "../components/settings/OptionSelect";
import { SettingsCard } from "../components/settings/SettingsCard";
import { SettingsCheckbox } from "../components/settings/SettingsCheckbox";

export default (props: { navId: string }) => {
	const { settings, setSettings } = useSettings();
	const [localSettings, setLocalSettings] = createStore(settings.translate);

	const [lLMOptions, setLLMOptions] = createSignal<SelectOption[]>([]);
	const [allOptions, setAllOptions] = createSignal<SelectOption[]>([]);

	const [validationErrors, setValidationErrors] =
		createSignal<z.ZodError | null>(null);

	createEffect(() => {
		const current = unwrap(trackStore(localSettings));
		const result = TranslateSettings.safeParse(current);
		if (!result.success) {
			setValidationErrors(result.error);
		} else {
			setValidationErrors(null);
			setSettings("translate", reconcile(result.data));
		}
	});

	createEffect(() => {
		trackStore(settings.services);
		const llmServices = unwrap(settings.services.llmServices);
		const traditionalServices = unwrap(settings.services.traditionalServices);

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

				<SettingsCheckbox
					label={t("settings.translation.filterTargetLanguage")}
					helperText={t("settings.translation.filterTargetLanguageDesc")}
					checked={localSettings.filterTargetLanguage}
					onChange={(e) =>
						setLocalSettings("filterTargetLanguage", e.target.checked)
					}
					disabled
				/>

				<SettingsCheckbox
					label={t("settings.translation.filterInteractive")}
					helperText={t("settings.translation.filterInteractiveDesc")}
					checked={localSettings.filterInteractive}
					onChange={(e) =>
						setLocalSettings("filterInteractive", e.target.checked)
					}
				/>

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
			</FormGrid>
		</SettingsCard>
	);
};
