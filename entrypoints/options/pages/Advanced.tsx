import { RotateCcw, Trash2 } from "lucide-solid";
import { createSignal } from "solid-js";
import { browser } from "#imports";
import { Button } from "~/components/Button";
import { SettingsCard } from "~/components/settings/SettingsCard";
import { useSettings } from "~/hooks/settings";
import { t } from "~/utils/i18n";
import { generateDefaultSettings } from "~/utils/settings/default";
import { clearSettingsMigrationError } from "~/utils/settings/helper";

export default (props: { navId: string }) => {
	const { setSettings } = useSettings();
	const [isClearingCache, setIsClearingCache] = createSignal(false);
	const [isResettingSettings, setIsResettingSettings] = createSignal(false);
	const [feedback, setFeedback] = createSignal<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	const handleClearCache = async () => {
		setIsClearingCache(true);
		setFeedback(null);

		try {
			await window.rpc.clearCache();
			setFeedback({
				type: "success",
				message: t("settings.advanced.clearCacheSuccess"),
			});
		} catch (_error) {
			setFeedback({
				type: "error",
				message: t("settings.advanced.clearCacheFailed"),
			});
		} finally {
			setIsClearingCache(false);
		}
	};

	const handleResetSettings = async () => {
		if (!confirm(t("settings.advanced.resetSettingsConfirm"))) {
			return;
		}

		setIsResettingSettings(true);
		setFeedback(null);

		try {
			setSettings(generateDefaultSettings());
			await clearSettingsMigrationError();
			await setFeedback({
				type: "success",
				message: t("settings.advanced.resetSettingsSuccess"),
			});
			browser.runtime.reload();
			return;
		} catch (error) {
			console.error("Failed to reset settings: ", error);
			setFeedback({
				type: "error",
				message: t("settings.advanced.resetSettingsFailed"),
			});
		} finally {
			setIsResettingSettings(false);
		}
	};

	return (
		<SettingsCard title={t("settings.advanced.title")} navId={props.navId}>
			<div class="space-y-6">
				<div class="form-control rounded-2xl border border-base-200 p-4">
					<label class="label">
						<span class="label-text flex items-center gap-2 font-semibold">
							<Trash2 size={16} />
							{t("settings.advanced.cleanCache")}
						</span>
					</label>
					<p class="mb-4 text-sm text-base-content/70">
						{t("settings.advanced.cleanCacheDesc")}
					</p>
					<Button
						variant="warning"
						size="sm"
						onClick={handleClearCache}
						disabled={isClearingCache()}
					>
						{isClearingCache() ? (
							<>
								<span class="loading loading-spinner loading-xs"></span>
								{t("settings.advanced.clearingCache")}
							</>
						) : (
							t("settings.advanced.cleanCache")
						)}
					</Button>
				</div>

				<div class="form-control rounded-2xl border border-base-200 p-4">
					<label class="label">
						<span class="label-text flex items-center gap-2 font-semibold">
							<RotateCcw size={16} />
							{t("settings.advanced.resetSettings")}
						</span>
					</label>
					<p class="mb-4 text-sm text-base-content/70">
						{t("settings.advanced.resetSettingsDesc")}
					</p>
					<Button
						variant="error"
						size="sm"
						onClick={handleResetSettings}
						disabled={isResettingSettings()}
					>
						{isResettingSettings() ? (
							<>
								<span class="loading loading-spinner loading-xs"></span>
								{t("settings.advanced.resettingSettings")}
							</>
						) : (
							t("settings.advanced.resetSettings")
						)}
					</Button>
				</div>

				{feedback() && (
					<div
						class={`alert ${
							feedback()?.type === "success" ? "alert-success" : "alert-error"
						}`}
					>
						<span>{feedback()?.message}</span>
					</div>
				)}
			</div>
		</SettingsCard>
	);
};
