import { ButtonGroup } from "~/components/settings/ButtonGroup";
import { FormGrid } from "~/components/settings/FormGrid";
import { SettingsCard } from "~/components/settings/SettingsCard";
import { SettingsToggle } from "~/components/settings/SettingsToggle";
import ShortcutInput from "../components/ShortcutInput";

export default (props: { navId: string }) => {
	const { settings, setSettings } = useSettings();

	const themeOptions = [
		{ value: "light", label: t("settings.basic.themeLight") },
		{ value: "dark", label: t("settings.basic.themeDark") },
		{ value: "system", label: t("settings.basic.themeSystem") },
	];

	const positionOptions = [
		{ value: "left", label: t("common.positionLeft") },
		{ value: "right", label: t("common.positionRight") },
	];

	return (
		<SettingsCard title={t("settings.basic.title")} navId={props.navId}>
			<FormGrid>
				<SettingsToggle
					label={t("settings.basic.enableExtension")}
					helperText={t("settings.basic.enableExtensionDesc")}
					checked={settings.basic.enabled}
					onChange={(e) => setSettings("basic", "enabled", e.target.checked)}
				/>

				<SettingsToggle
					label={t("settings.basic.selectionPopupEnabled")}
					helperText={t("settings.basic.selectionPopupEnabledDesc")}
					checked={settings.basic.selectionPopupEnabled}
					onChange={(e) =>
						setSettings("basic", "selectionPopupEnabled", e.target.checked)
					}
				/>

				<SettingsToggle
					label={t("settings.basic.floatingBallEnabled")}
					helperText={t("settings.basic.floatingBallEnabledDesc")}
					checked={settings.basic.floatingBallEnabled}
					onChange={(e) =>
						setSettings("basic", "floatingBallEnabled", e.target.checked)
					}
				/>
			</FormGrid>
			<div class="divider m-0" />
			<FormGrid>
				<div class="form-control">
					<label class="label">
						<span class="label-text">{t("settings.basic.theme")}</span>
					</label>
					<ButtonGroup
						options={themeOptions}
						value={settings.basic.theme}
						onChange={(value) =>
							setSettings(
								"basic",
								"theme",
								value as "light" | "dark" | "system",
							)
						}
						title={t("settings.basic.themeDesc")}
					/>
					<br />
					<label class="label">
						<span class="label-text-alt text-xs">
							{t("settings.basic.themeDesc")}
						</span>
					</label>
				</div>

				<div class="form-control">
					<label class="label">
						<span class="label-text">
							{t("settings.basic.floatingBallPosition")}
						</span>
					</label>
					<ButtonGroup
						options={positionOptions}
						value={settings.basic.floatingBallPosition.side}
						onChange={(value) =>
							setSettings(
								"basic",
								"floatingBallPosition",
								"side",
								value as "left" | "right",
							)
						}
						title={t("settings.basic.floatingBallPositionDesc")}
					/>
					<br />
					<label class="label">
						<span class="label-text-alt text-xs">
							{t("settings.basic.floatingBallPositionDesc")}
						</span>
					</label>
				</div>
			</FormGrid>
			<div class="divider m-0" />
			<FormGrid>
				<ShortcutInput
					value={settings.basic.keyboardShortcut}
					enabled={settings.basic.keyboardShortcutEnabled}
					onChange={(shortcut) =>
						setSettings("basic", "keyboardShortcut", shortcut)
					}
					onEnabledChange={(enabled) =>
						setSettings("basic", "keyboardShortcutEnabled", enabled)
					}
				/>

				<SettingsToggle
					label={t("settings.basic.autoPin")}
					helperText={t("settings.basic.autoPinDesc")}
					checked={settings.basic.autoPin}
					onChange={(e) => setSettings("basic", "autoPin", e.target.checked)}
				/>

				<SettingsToggle
					label={t("settings.basic.selectionTranslateEnabled")}
					helperText={t("settings.basic.selectionTranslateEnabledDesc")}
					checked={settings.basic.selectionTranslateEnabled}
					onChange={(e) =>
						setSettings("basic", "selectionTranslateEnabled", e.target.checked)
					}
				/>

				<SettingsToggle
					label={t("settings.basic.inputTranslateEnabled")}
					helperText={t("settings.basic.inputTranslateEnabledDesc")}
					checked={settings.basic.inputTranslateEnabled}
					onChange={(e) =>
						setSettings("basic", "inputTranslateEnabled", e.target.checked)
					}
				/>

				<SettingsToggle
					label={t("settings.basic.progressIndicationEnabled")}
					helperText={t("settings.basic.progressIndicationEnabledDesc")}
					checked={settings.basic.progressIndicationEnabled}
					onChange={(e) =>
						setSettings("basic", "progressIndicationEnabled", e.target.checked)
					}
				/>
			</FormGrid>
		</SettingsCard>
	);
};
