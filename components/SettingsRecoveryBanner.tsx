import { TriangleAlert } from "lucide-solid";
import type { Component } from "solid-js";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { type Browser, browser } from "#imports";
import { Button } from "~/components/Button";
import { useSettings } from "~/hooks/settings";
import { cn } from "~/utils/cn";
import { STORAGE_KEYS } from "~/utils/constants";
import { t } from "~/utils/i18n";
import { generateDefaultSettings } from "~/utils/settings/default";
import {
	clearSettingsMigrationError,
	getSettingsMigrationError,
	type SettingsMigrationErrorState,
} from "~/utils/settings/helper";

interface SettingsRecoveryBannerProps {
	class?: string;
}

export const SettingsRecoveryBanner: Component<SettingsRecoveryBannerProps> = (
	props,
) => {
	const { setSettings } = useSettings();
	const [errorInfo, setErrorInfo] = createSignal<
		SettingsMigrationErrorState | undefined
	>();
	const [resetting, setResetting] = createSignal(false);
	const [resetError, setResetError] = createSignal<string | null>(null);

	const fetchErrorState = async () => {
		try {
			const info = await getSettingsMigrationError();
			setErrorInfo(info);
		} catch (error) {
			console.error("Failed to read settings migration error flag", error);
			setErrorInfo(undefined);
		}
	};

	const handleReset = async () => {
		if (!confirm(t("settings.advanced.resetSettingsConfirm"))) {
			return;
		}

		setResetting(true);
		setResetError(null);
		try {
			setSettings(generateDefaultSettings());
			await clearSettingsMigrationError();
			setErrorInfo(undefined);
			browser.runtime.reload();
			return;
		} catch (error) {
			console.error("Failed to reset settings", error);
			setResetError(t("migrationError.resetFailed"));
		} finally {
			setResetting(false);
		}
	};

	onMount(() => {
		void fetchErrorState();
		const listener = (
			changes: {
				[key: string]: Browser.storage.StorageChange;
			},
			area: Browser.storage.AreaName,
		) => {
			if (area !== "local") return;
			if (changes[STORAGE_KEYS.settingsMigrationError]) {
				setErrorInfo(changes[STORAGE_KEYS.settingsMigrationError].newValue);
			}
		};
		browser.storage.onChanged.addListener(listener);
		onCleanup(() => browser.storage.onChanged.removeListener(listener));
	});

	return (
		<Show when={errorInfo()}>
			<div
				class={cn(
					"rounded-2xl border border-error/40 bg-error/10 p-4 space-y-3",
					props.class,
				)}
			>
				<div class="space-y-2">
					<p class="font-semibold text-error flex items-center gap-2">
						<TriangleAlert class="h-5 w-5" />
						{t("migrationError.title")}
					</p>
					<p class="text-sm text-error-content/80">
						{t("migrationError.description")}
					</p>
					<Show when={errorInfo()?.message}>
						<p class="text-xs text-error-content/70 break-words">
							{t("migrationError.detailsLabel")}: {errorInfo()?.message}
						</p>
					</Show>
				</div>
				<Button
					class="w-full justify-center gap-2 text-base"
					size="lg"
					variant="error"
					on:click={handleReset}
					disabled={resetting()}
				>
					<Show
						when={resetting()}
						fallback={<span>{t("migrationError.resetButton")}</span>}
					>
						<span class="loading loading-spinner loading-sm" />
						{t("settings.advanced.resettingSettings")}
					</Show>
				</Button>
				<Show when={resetError()}>
					<p class="text-sm text-error-content">{resetError()}</p>
				</Show>
			</div>
		</Show>
	);
};
