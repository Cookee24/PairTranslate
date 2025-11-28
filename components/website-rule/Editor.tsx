import { trackStore } from "@solid-primitives/deep";
import { Plus, Trash2 } from "lucide-solid";
import { createEffect, createMemo, For, on, Show } from "solid-js";
import { createStore, unwrap } from "solid-js/store";
import { Button } from "~/components/Button";
import { Input } from "~/components/Input";
import { Select } from "~/components/Select";
import { ButtonGroup } from "~/components/settings/ButtonGroup";
import { FormField } from "~/components/settings/FormField";
import type { SelectOption } from "~/components/settings/OptionSelect";
import { useSettings } from "~/hooks/settings";
import { SUPPORTED_LANGUAGES } from "~/utils/constants";
import { t } from "~/utils/i18n";
import type { WebsiteRuleSettings } from "~/utils/settings";
import { selectServicesByType } from "~/utils/settings/services";

interface Props {
	s: WebsiteRuleSettings;
	onChange?: (newSettings: WebsiteRuleSettings) => void;
}

export const WebsiteRuleEditor = (props: Props) => {
	const { settings } = useSettings();
	const [local, setLocal] = createStore<WebsiteRuleSettings>({ ...props.s });
	const [errors, setErrors] = createStore({
		urlPatterns: "" as string,
	});

	createEffect(
		on(
			() => trackStore(local),
			(val) => {
				props.onChange?.(unwrap(val));
			},
			{ defer: true },
		),
	);

	const modelOptions = createMemo<SelectOption[]>(() => {
		const options: SelectOption[] = [
			{ value: "default", label: t("common.globalDefault") },
		];

		const llmServices = selectServicesByType(settings.services, "llm");
		const traditionalServices = selectServicesByType(
			settings.services,
			"traditional",
		);

		for (const [uuid, service] of Object.entries(llmServices)) {
			options.push({
				value: uuid,
				label: service.name,
				disabled: false,
			});
		}

		for (const [uuid, service] of Object.entries(traditionalServices)) {
			options.push({
				value: uuid,
				label: service.name,
				disabled: false,
			});
		}

		return options;
	});

	const sourceLanguageOptions = createMemo<SelectOption[]>(() => [
		{ value: "default", label: t("common.globalDefault") },
		{ value: "", label: t("settings.translation.autoDetect") },
		...SUPPORTED_LANGUAGES.map((lang) => ({
			value: lang.code,
			label: `${lang.nativeName} (${lang.name})`,
		})),
	]);

	const targetLanguageOptions = createMemo<SelectOption[]>(() => [
		{ value: "default", label: t("common.globalDefault") },
		...SUPPORTED_LANGUAGES.map((lang) => ({
			value: lang.code,
			label: `${lang.nativeName} (${lang.name})`,
		})),
	]);

	const handleAddPattern = (e: SubmitEvent) => {
		e.preventDefault();
		e.stopPropagation();
		const formData = new FormData(e.currentTarget as HTMLFormElement);
		const pattern = (formData.get("pattern") as string).trim();

		if (!pattern) {
			setErrors("urlPatterns", t("websiteRule.errorPatternRequired"));
			return;
		}

		if (local.urlPatterns.includes(pattern)) {
			setErrors("urlPatterns", t("websiteRule.errorPatternExists"));
			return;
		}

		setLocal("urlPatterns", [...local.urlPatterns, pattern.trim()]);
		setErrors("urlPatterns", "");

		// Clear the input after adding
		(e.currentTarget as HTMLFormElement).reset();
	};

	const handleRemovePattern = (index: number) => {
		setLocal(
			"urlPatterns",
			local.urlPatterns.filter((_, i) => i !== index),
		);
	};

	const handleClearAllPatterns = () => {
		setLocal("urlPatterns", []);
	};

	return (
		<div class="flex flex-col gap-4 w-full wrap-anywhere">
			{/* URL Patterns Section */}
			<div class="card bg-base-200">
				<div class="card-body gap-4">
					<h3 class="card-title text-lg">{t("websiteRule.urlPatterns")}</h3>
					<p class="text-sm opacity-70">{t("websiteRule.urlPatternsDesc")}</p>

					{/* Pattern Input */}
					<form class="flex gap-2" onSubmit={handleAddPattern}>
						<Input
							name="pattern"
							class="flex-1"
							placeholder={t("websiteRule.patternPlaceholder")}
							error={!!errors.urlPatterns}
						/>
						<Button variant="primary" type="submit">
							<Plus size={16} />
							{t("common.add")}
						</Button>
					</form>

					<Show when={errors.urlPatterns}>
						<p class="text-error text-sm">{errors.urlPatterns}</p>
					</Show>

					{/* Pattern List */}
					<Show
						when={local.urlPatterns.length > 0}
						fallback={
							<div class="text-center py-4 opacity-50">
								{t("websiteRule.noPatterns")}
							</div>
						}
					>
						<div class="flex flex-col gap-2">
							<div class="flex justify-between items-center mb-2">
								<span class="text-sm opacity-70">
									{local.urlPatterns.length} {t("websiteRule.patternsCount")}
								</span>
								<Button
									size="xs"
									variant="ghost"
									onClick={handleClearAllPatterns}
								>
									<Trash2 size={14} />
									{t("websiteRule.deleteAllPatterns")}
								</Button>
							</div>
							<For each={local.urlPatterns}>
								{(pattern, index) => (
									<div class="flex items-center gap-2 p-2 bg-base-300 rounded">
										<code class="flex-1 text-sm">{pattern}</code>
										<Button
											size="xs"
											variant="ghost"
											onClick={() => handleRemovePattern(index())}
										>
											<Trash2 size={14} />
										</Button>
									</div>
								)}
							</For>
						</div>
					</Show>

					{/* Pattern Help */}
					<div class="alert alert-info">
						<div class="text-xs">
							<p class="font-bold mb-1">{t("websiteRule.patternExamples")}</p>
							<ul class="list-disc list-inside space-y-1">
								<li>
									<code>example.com</code> - {t("websiteRule.patternExact")}
								</li>
								<li>
									<code>*.example.com</code> -{" "}
									{t("websiteRule.patternSubdomains")}
								</li>
								<li>
									<code>*.github.com</code> - {t("websiteRule.patternExample")}
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>

			{/* Translation Settings Section */}
			<div class="card bg-base-200">
				<div class="card-body gap-4">
					<h3 class="card-title text-lg">
						{t("websiteRule.translationSettings")}
					</h3>

					{/* Enable Translation */}
					<FormField
						label={t("websiteRule.enableTranslation")}
						helperText={t("websiteRule.enableTranslationDesc")}
					>
						<ButtonGroup
							options={[
								{ value: "default", label: t("common.globalDefault") },
								{ value: "true", label: t("common.yes") },
								{ value: "false", label: t("common.no") },
							]}
							value={
								local.enableTranslation === undefined
									? "default"
									: local.enableTranslation
										? "true"
										: "false"
							}
							onChange={(value) => {
								if (value === "default") {
									setLocal("enableTranslation", undefined);
								} else if (value === "true") {
									setLocal("enableTranslation", true);
								} else {
									setLocal("enableTranslation", false);
								}
							}}
						/>
					</FormField>
					<FormField
						label={t("websiteRule.translationMode")}
						helperText={t("websiteRule.translationModeDesc")}
					>
						<ButtonGroup
							options={[
								{ value: "default", label: t("common.globalDefault") },
								{ value: "parallel", label: t("websiteRule.modeParallel") },
								{ value: "replace", label: t("websiteRule.modeReplace") },
							]}
							value={
								local.translateMode === undefined
									? "default"
									: local.translateMode
							}
							onChange={(value) => {
								if (value === "default") {
									setLocal("translateMode", undefined);
								} else {
									setLocal("translateMode", value as "parallel" | "replace");
								}
							}}
						/>
					</FormField>

					{/* Source Language */}
					<FormField label={t("settings.translation.sourceLanguage")}>
						<Select
							value={local.sourceLang || ""}
							onChange={(e) => {
								const value = e.currentTarget.value;
								setLocal("sourceLang", value || undefined);
							}}
							options={sourceLanguageOptions()}
						/>
					</FormField>

					{/* Target Language */}
					<FormField label={t("settings.translation.targetLanguage")}>
						<Select
							value={local.targetLang || ""}
							onChange={(e) => {
								const value = e.currentTarget.value;
								setLocal("targetLang", value || undefined);
							}}
							options={targetLanguageOptions()}
						/>
					</FormField>

					{/* In-text Translation Model */}
					<FormField label={t("settings.translation.inTextTranslateModel")}>
						<Select
							value={local.inTextTranslateModel || "default"}
							onChange={(e) => {
								const value = e.currentTarget.value;
								if (value === "default") {
									setLocal("inTextTranslateModel", undefined);
								} else {
									setLocal("inTextTranslateModel", value);
								}
							}}
							options={modelOptions()}
						/>
					</FormField>
				</div>
			</div>

			{/* Advanced Settings Section */}
			<div class="card bg-base-200">
				<div class="card-body gap-4">
					<h3 class="card-title text-lg">
						{t("websiteRule.advancedSettings")}
					</h3>

					{/* Floating Ball */}
					<FormField
						label={t("settings.basic.floatingBallEnabled")}
						helperText={t("websiteRule.floatingBallToggleDesc")}
					>
						<ButtonGroup
							options={[
								{ value: "default", label: t("common.globalDefault") },
								{ value: "true", label: t("common.yes") },
								{ value: "false", label: t("common.no") },
							]}
							value={
								local.floatingBallEnabled === undefined
									? "default"
									: local.floatingBallEnabled
										? "true"
										: "false"
							}
							onChange={(value) => {
								if (value === "default") {
									setLocal("floatingBallEnabled", undefined);
								} else if (value === "true") {
									setLocal("floatingBallEnabled", true);
								} else {
									setLocal("floatingBallEnabled", false);
								}
							}}
						/>
					</FormField>

					{/* Translate Full Page */}
					<FormField
						label={t("settings.translation.translateFullPage")}
						helperText={t("settings.translation.translateFullPageDesc")}
					>
						<ButtonGroup
							options={[
								{ value: "default", label: t("common.globalDefault") },
								{ value: "true", label: t("settings.translation.fullPage") },
								{ value: "false", label: t("settings.translation.visible") },
							]}
							value={
								local.translateFullPage === undefined
									? "default"
									: local.translateFullPage
										? "true"
										: "false"
							}
							onChange={(value) => {
								if (value === "default") {
									setLocal("translateFullPage", undefined);
								} else if (value === "true") {
									setLocal("translateFullPage", true);
								} else {
									setLocal("translateFullPage", false);
								}
							}}
						/>
					</FormField>

					{/* Filter Interactive */}
					<FormField
						label={t("settings.translation.filterInteractive")}
						helperText={t("settings.translation.filterInteractiveDesc")}
					>
						<ButtonGroup
							options={[
								{ value: "default", label: t("common.globalDefault") },
								{ value: "true", label: t("common.yes") },
								{ value: "false", label: t("common.no") },
							]}
							value={
								local.filterInteractive === undefined
									? "default"
									: local.filterInteractive
										? "true"
										: "false"
							}
							onChange={(value) => {
								if (value === "default") {
									setLocal("filterInteractive", undefined);
								} else if (value === "true") {
									setLocal("filterInteractive", true);
								} else {
									setLocal("filterInteractive", false);
								}
							}}
						/>
					</FormField>
				</div>
			</div>
		</div>
	);
};
