import { Edit, Plus, Trash2 } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import { Button } from "~/components/Button";
import { Card } from "~/components/Card";
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

	const renderRuleDetails = (rule: WebsiteRuleSettings) => (
		<div class="space-y-2 text-sm text-base-content/70">
			<div>
				<strong>{t("options.websiteRules.urlPatterns")}:</strong>
				<div class="flex flex-wrap gap-1 mt-1">
					<For each={rule.urlPatterns}>
						{(pattern) => (
							<span class="badge badge-sm badge-neutral">{pattern}</span>
						)}
					</For>
				</div>
			</div>
			<Show when={rule.enableTranslation !== undefined}>
				<p>
					<strong>{t("options.websiteRules.translationEnabled")}:</strong>{" "}
					{rule.enableTranslation ? t("common.yes") : t("common.no")}
				</p>
			</Show>
			<Show when={rule.translateMode !== undefined}>
				<p>
					<strong>{t("options.websiteRules.translationMode")}:</strong>{" "}
					{rule.translateMode === "parallel"
						? t("websiteRule.modeParallel")
						: t("websiteRule.modeReplace")}
				</p>
			</Show>
			<Show
				when={rule.sourceLang !== undefined || rule.targetLang !== undefined}
			>
				<p>
					<strong>{t("options.websiteRules.languages")}:</strong>{" "}
					{rule.sourceLang || t("settings.translation.autoDetect")} →{" "}
					{rule.targetLang || t("common.globalDefault")}
				</p>
			</Show>
		</div>
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
				<div class="flex justify-between items-center mb-4">
					<div class="text-sm text-base-content/70">
						{t("options.websiteRules.description")}
					</div>
					<Button variant="primary" size="sm" onClick={handleAddRule}>
						<Plus size={16} />
						{t("options.websiteRules.addRule")}
					</Button>
				</div>

				<Show when={rules().length === 0}>
					<div class="text-center py-8 text-base-content/70">
						<p>{t("options.websiteRules.noRulesConfigured")}</p>
						<p class="text-sm mt-2">{t("options.websiteRules.noRulesDesc")}</p>
					</div>
				</Show>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<For each={rules()}>
						{([index, rule]) => (
							<Card.Root dash class="rounded-box">
								<Card.Body class="p-4">
									<div class="flex justify-between items-start mb-2">
										<h3 class="font-semibold text-lg">
											{t("options.websiteRules.ruleNumber", [
												(index + 1).toString(),
											])}
										</h3>
										<div class="flex gap-2">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleEditRule(index)}
											>
												<Edit size={14} />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleDeleteRule(index)}
											>
												<Trash2 size={14} />
											</Button>
										</div>
									</div>
									{renderRuleDetails(rule)}
								</Card.Body>
							</Card.Root>
						)}
					</For>
				</div>
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
