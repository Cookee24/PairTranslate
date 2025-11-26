import { Download, FolderSync, RotateCcw, Trash2, Upload } from "lucide-solid";
import { createSignal } from "solid-js";
import { reconcile } from "solid-js/store";
import { browser } from "#imports";
import { Button } from "~/components/Button";
import { SettingsCard } from "~/components/settings/SettingsCard";
import { useSettings } from "~/hooks/settings";
import { t } from "~/utils/i18n";
import { SettingsSchema } from "~/utils/settings/def";
import { generateDefaultSettings } from "~/utils/settings/default";
import { clearSettingsMigrationError } from "~/utils/settings/helper";
import { migrateSettings } from "~/utils/settings/migration";

export default (props: { navId: string }) => {
	const { settings, setSettings } = useSettings();
	const [isClearingCache, setIsClearingCache] = createSignal(false);
	const [isResettingSettings, setIsResettingSettings] = createSignal(false);
	const [isExporting, setIsExporting] = createSignal(false);
	const [isImporting, setIsImporting] = createSignal(false);
	const [feedback, setFeedback] = createSignal<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	let fileInputRef: HTMLInputElement | undefined;

	const handleExportSettings = async () => {
		setIsExporting(true);
		setFeedback(null);

		try {
			const payload = JSON.stringify(settings, null, 2);
			const blob = new Blob([payload], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = `pairtranslate-settings-${new Date().toISOString().slice(0, 10)}.json`;
			anchor.click();
			URL.revokeObjectURL(url);
			setFeedback({
				type: "success",
				message: t("settings.advanced.exportSuccess"),
			});
		} catch (_error) {
			setFeedback({
				type: "error",
				message: t("settings.advanced.exportFailed"),
			});
		} finally {
			setIsExporting(false);
		}
	};

	const handleImportSettings = async (file: File) => {
		setIsImporting(true);
		setFeedback(null);

		try {
			const text = await file.text();
			const parsed = JSON.parse(text);

			// Try to migrate and validate the settings
			const migrated = migrateSettings(parsed);
			const validated = SettingsSchema.safeParse(migrated);

			if (!validated.success) {
				throw new Error(t("settings.advanced.importInvalidFormat"));
			}

			setSettings(reconcile(validated.data));
			await clearSettingsMigrationError();
			setFeedback({
				type: "success",
				message: t("settings.advanced.importSuccess"),
			});
		} catch (error) {
			console.error("Failed to import settings:", error);
			setFeedback({
				type: "error",
				message:
					error instanceof SyntaxError
						? t("settings.advanced.importInvalidJson")
						: error instanceof Error
							? error.message
							: t("settings.advanced.importFailed"),
			});
		} finally {
			setIsImporting(false);
			// Reset the file input so the same file can be selected again
			if (fileInputRef) {
				fileInputRef.value = "";
			}
		}
	};

	const handleFileSelect = (e: Event) => {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			handleImportSettings(file);
		}
	};

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
							<FolderSync size={16} />
							{t("settings.advanced.backupRestore")}
						</span>
					</label>
					<p class="mb-4 text-sm text-base-content/70">
						{t("settings.advanced.backupRestoreDesc")}
					</p>
					<div class="flex flex-wrap gap-2">
						<Button
							variant="primary"
							size="sm"
							onClick={handleExportSettings}
							disabled={isExporting()}
						>
							{isExporting() ? (
								<>
									<span class="loading loading-spinner loading-xs"></span>
									{t("settings.advanced.exporting")}
								</>
							) : (
								<>
									<Download size={14} />
									{t("settings.advanced.exportSettings")}
								</>
							)}
						</Button>
						<input
							ref={fileInputRef}
							type="file"
							accept=".json"
							class="hidden"
							onChange={handleFileSelect}
						/>
						<Button
							variant="secondary"
							size="sm"
							onClick={() => fileInputRef?.click()}
							disabled={isImporting()}
						>
							{isImporting() ? (
								<>
									<span class="loading loading-spinner loading-xs"></span>
									{t("settings.advanced.importing")}
								</>
							) : (
								<>
									<Upload size={14} />
									{t("settings.advanced.importSettings")}
								</>
							)}
						</Button>
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
								<>
									<RotateCcw size={14} />
									{t("settings.advanced.resetSettings")}
								</>
							)}
						</Button>
					</div>
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
