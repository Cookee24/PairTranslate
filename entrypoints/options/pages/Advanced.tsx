import { RotateCcw, Trash2 } from "lucide-solid";
import { useSettings } from "~/hooks/settings";
import { t } from "~/utils/i18n";

export default (props: { navId: string }) => {
	useSettings();
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
			await window.rpc.resetSettings();
			setFeedback({
				type: "success",
				message: t("settings.advanced.resetSettingsSuccess"),
			});
		} catch (_error) {
			setFeedback({
				type: "error",
				message: t("settings.advanced.resetSettingsFailed"),
			});
		} finally {
			setIsResettingSettings(false);
		}
	};

	return (
		<Card.Root class="bg-base-200 rounded-xl shadow-sm" data-nav={props.navId}>
			<Card.Body>
				<Card.Title>{t("settings.advanced.title")}</Card.Title>
				<div class="space-y-6">
					<div class="form-control">
						<label class="label">
							<span class="label-text font-semibold flex items-center gap-2">
								<Trash2 size={16} />
								{t("settings.advanced.cleanCache")}
							</span>
						</label>
						<p class="text-sm text-base-content/70 mb-4">
							{t("settings.advanced.cleanCacheDesc")}
						</p>
						<Button
							variant="warning"
							size="sm"
							onClick={handleClearCache}
							disabled={isClearingCache()}
							outline
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

					<div class="form-control">
						<label class="label">
							<span class="label-text font-semibold flex items-center gap-2">
								<RotateCcw size={16} />
								{t("settings.advanced.resetSettings")}
							</span>
						</label>
						<p class="text-sm text-base-content/70 mb-4">
							{t("settings.advanced.resetSettingsDesc")}
						</p>
						<Button
							variant="error"
							size="sm"
							onClick={handleResetSettings}
							disabled={isResettingSettings()}
							outline
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
			</Card.Body>
		</Card.Root>
	);
};
