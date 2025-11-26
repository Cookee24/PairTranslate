import { GlobeLock, Pencil, Plus, Trash2 } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import { Badge } from "~/components/Badge";
import { Button } from "~/components/Button";
import { Modal } from "~/components/Modal";
import { SectionResetButton } from "~/components/settings/SectionResetButton";
import { SettingsCard } from "~/components/settings/SettingsCard";
import { WebsiteRuleEditor } from "~/components/website-rule/Editor";
import { useSettings } from "~/hooks/settings";
import { t } from "~/utils/i18n";
import { generateWebsiteRuleSettings } from "~/utils/settings";
import type { WebsiteRuleSettings } from "~/utils/settings/def";
import { useWebsiteRuleManagement } from "../hooks/useWebsiteRuleManagement";

export default (props: { navId: string }) => {
	const { settings, setSettings } = useSettings();
	const [showConfirmClose, setShowConfirmClose] = createSignal(false);

	let changed = false;
	let currentRule: WebsiteRuleSettings | null = null;

	const {
		rules,
		showModal,
		editingRule,
		handleAddRule,
		handleEditRule,
		handleDeleteRule,
		handleSaveRule,
		handleCloseModal,
	} = useWebsiteRuleManagement(
		() => settings.websiteRules,
		(updater) => setSettings("websiteRules", updater),
	);

	const handleSave = () => {
		if (currentRule) {
			handleSaveRule(currentRule);
			handleCloseModal();
			changed = false;
		}
	};

	const handleClose = () => {
		if (changed) {
			setShowConfirmClose(true);
		} else {
			handleCloseModal();
		}
	};

	const confirmClose = () => {
		setShowConfirmClose(false);
		handleCloseModal();
	};

	const handleReset = () =>
		setSettings("websiteRules", () => generateWebsiteRuleSettings());

	return (
		<>
			<SettingsCard
				title={t("options.websiteRules.title")}
				navId={props.navId}
				actions={<SectionResetButton onReset={handleReset} />}
			>
				<div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-base-200 bg-base-50 px-4 py-3">
					<p class="text-sm text-base-content/70 flex-1">
						{t("options.websiteRules.description")}
					</p>
					<Button variant="primary" size="sm" onClick={handleAddRule}>
						<Plus size={16} />
						{t("options.websiteRules.addRule")}
					</Button>
				</div>

				<Show when={rules().length === 0}>
					<div class="mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-base-300 bg-base-50 p-8 text-base-content/70">
						<GlobeLock size={36} class="mb-3 text-base-content/60" />
						<p class="text-base font-semibold">
							{t("options.websiteRules.noRulesConfigured")}
						</p>
						<p class="mt-2 text-sm">{t("options.websiteRules.noRulesDesc")}</p>
						<button
							type="button"
							class="btn btn-xs btn-outline mt-4"
							onClick={handleAddRule}
						>
							{t("options.websiteRules.addRule")}
						</button>
					</div>
				</Show>

				<Show when={rules().length > 0}>
					<div class="mt-4 overflow-x-auto rounded-2xl border border-base-200 bg-base-100">
						<table class="table w-full text-sm">
							<thead>
								<tr class="text-xs uppercase tracking-wide text-base-content/60">
									<th class="w-12 font-medium">#</th>
									<th class="font-medium">
										{t("options.websiteRules.urlPatterns")}
									</th>
									<th class="font-medium">
										{t("options.websiteRules.translationMode")}
									</th>
									<th class="font-medium">
										{t("options.websiteRules.languages")}
									</th>
									<th
										class="w-32 text-right font-medium"
										aria-label={`${t("common.edit")}/${t("common.delete")}`}
									></th>
								</tr>
							</thead>
							<tbody>
								<For each={rules()}>
									{([index, rule]) => (
										<tr>
											<td class="align-top py-4 text-sm font-semibold text-base-content">
												{index + 1}
											</td>
											<td class="align-top py-4">
												<div class="flex flex-wrap gap-1">
													<For each={rule.urlPatterns}>
														{(pattern) => (
															<Badge variant="secondary" size="sm">
																{pattern}
															</Badge>
														)}
													</For>
												</div>
											</td>
											<td class="align-top py-4 text-sm text-base-content/70">
												<div class="space-y-1">
													<Show when={rule.enableTranslation !== undefined}>
														<p class="text-base-content">
															<span class="font-medium">
																{t("options.websiteRules.translationEnabled")}:
															</span>{" "}
															{rule.enableTranslation
																? t("common.yes")
																: t("common.no")}
														</p>
													</Show>
													<Show when={rule.translateMode !== undefined}>
														<p>
															<span class="font-medium">
																{t("options.websiteRules.translationMode")}:
															</span>{" "}
															{rule.translateMode === "parallel"
																? t("websiteRule.modeParallel")
																: t("websiteRule.modeReplace")}
														</p>
													</Show>
												</div>
											</td>
											<td class="align-top py-4 text-sm text-base-content/70">
												<Show
													when={
														rule.sourceLang !== undefined ||
														rule.targetLang !== undefined
													}
													fallback={
														<span class="text-base-content">
															{t("settings.translation.autoDetect")} →{" "}
															{t("common.globalDefault")}
														</span>
													}
												>
													<span class="text-base-content">
														{rule.sourceLang ||
															t("settings.translation.autoDetect")}{" "}
														→ {rule.targetLang || t("common.globalDefault")}
													</span>
												</Show>
											</td>
											<td class="align-top py-4 text-right">
												<div class="join justify-end">
													<Button
														variant="ghost"
														size="sm"
														class="join-item tooltip"
														data-tip={t("common.edit")}
														onClick={() => handleEditRule(index)}
													>
														<Pencil size={16} />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														class="join-item tooltip"
														data-tip={t("common.delete")}
														onClick={() => handleDeleteRule(index)}
													>
														<Trash2 size={16} />
													</Button>
												</div>
											</td>
										</tr>
									)}
								</For>
							</tbody>
						</table>
					</div>
				</Show>
			</SettingsCard>

			<Modal
				open={showModal()}
				onClose={handleClose}
				title={
					editingRule()
						? t("options.websiteRules.editRule")
						: t("options.websiteRules.addRule")
				}
				actions={
					<>
						<Button variant="ghost" onClick={handleClose}>
							{t("common.cancel")}
						</Button>
						<Button variant="primary" onClick={handleSave}>
							{t("common.save")}
						</Button>
					</>
				}
			>
				<WebsiteRuleEditor
					s={editingRule()?.[1] ?? { urlPatterns: [] }}
					onChange={(val) => {
						changed = true;
						currentRule = val;
					}}
				/>
			</Modal>

			{/* Confirm close dialog */}
			<Modal
				open={showConfirmClose()}
				onClose={() => setShowConfirmClose(false)}
				title={t("options.websiteRules.unsavedChanges")}
				actions={
					<>
						<Button variant="ghost" onClick={() => setShowConfirmClose(false)}>
							{t("common.cancel")}
						</Button>
						<Button variant="warning" onClick={confirmClose}>
							{t("options.websiteRules.discardChanges")}
						</Button>
					</>
				}
			>
				<p>{t("options.websiteRules.unsavedChangesDesc")}</p>
			</Modal>
		</>
	);
};
