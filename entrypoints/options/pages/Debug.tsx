import { createSignal, For, Show } from "solid-js";
import { Alert } from "~/components/Alert";
import { Button } from "~/components/Button";
import { NumberInput } from "~/components/settings/NumberInput";
import { SettingsCard } from "~/components/settings/SettingsCard";
import { SettingsToggle } from "~/components/settings/SettingsToggle";
import { useSettings } from "~/hooks/settings";
import { t } from "~/utils/i18n";
import type { DebugSettings } from "~/utils/settings/def";

interface DebugProps {
	navId: string;
}

type FeedbackState = {
	variant: "success" | "error" | "info";
	message: string;
};

const DIAGNOSTIC_KEYS = {
	settings: "settings",
	queues: "queues",
	ping: "ping",
	cache: "cache",
} as const;

const downloadJson = (filename: string, data: unknown) => {
	const payload = JSON.stringify(data, null, 2);
	const blob = new Blob([payload], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
};

export default (props: DebugProps) => {
	const { settings, setSettings } = useSettings();
	const [actionLoading, setActionLoading] = createSignal<
		Record<string, boolean>
	>({});
	const [feedback, setFeedback] = createSignal<FeedbackState | null>(null);

	const setLoadingState = (key: string, value: boolean) => {
		setActionLoading((state) => ({ ...state, [key]: value }));
	};

	const withAction = async (key: string, action: () => Promise<void>) => {
		setLoadingState(key, true);
		setFeedback(null);
		try {
			await action();
		} catch (error) {
			setFeedback({
				variant: "error",
				message:
					error instanceof Error
						? error.message
						: String(error ?? "Unknown error"),
			});
		} finally {
			setLoadingState(key, false);
		}
	};

	const runSettingsExport = async () => {
		await withAction(DIAGNOSTIC_KEYS.settings, async () => {
			downloadJson(
				`pairtranslate-settings-${new Date().toISOString()}.json`,
				settings,
			);
			setFeedback({
				variant: "success",
				message: `${t("settings.debug.exportSettings")} · ${t("common.completed")}`,
			});
		});
	};

	const collectQueueSnapshot = async () => {
		const entries = Object.entries(settings.services);
		const snapshots = await Promise.all(
			entries.map(async ([serviceId, service]) => {
				try {
					const iterator = window.rpc.queueStatus(serviceId);
					const { value } = await iterator.next();
					if (iterator.return) {
						await iterator.return();
					}
					return {
						serviceId,
						serviceName: service.name,
						serviceType: service.type,
						queue: value ?? null,
					};
				} catch (error) {
					return {
						serviceId,
						serviceName: service.name,
						serviceType: service.type,
						error: error instanceof Error ? error.message : String(error),
					};
				}
			}),
		);
		return {
			generatedAt: new Date().toISOString(),
			snapshots,
		};
	};

	const runQueueExport = async () => {
		await withAction(DIAGNOSTIC_KEYS.queues, async () => {
			const snapshot = await collectQueueSnapshot();
			downloadJson(
				`pairtranslate-queues-${snapshot.generatedAt}.json`,
				snapshot,
			);
			setFeedback({
				variant: "success",
				message: `${t("settings.debug.exportQueues")} · ${t("common.completed")}`,
			});
		});
	};

	const runPing = async () => {
		await withAction(DIAGNOSTIC_KEYS.ping, async () => {
			const response = await window.rpc.ping();
			setFeedback({
				variant: "info",
				message: `Ping → ${response}`,
			});
		});
	};

	const runCacheReset = async () => {
		await withAction(DIAGNOSTIC_KEYS.cache, async () => {
			await window.rpc.clearCache();
			setFeedback({
				variant: "success",
				message: `${t("settings.debug.clearRpcCache")} · ${t("common.completed")}`,
			});
		});
	};

	const toggleConfig: Array<{
		key: Exclude<keyof DebugSettings, "simulateLatencyMs">;
		label: string;
		description: string;
	}> = [
		{
			key: "verboseLogging",
			label: t("settings.debug.verboseLogging"),
			description: t("settings.debug.verboseLoggingDesc"),
		},
		{
			key: "traceLlms",
			label: t("settings.debug.traceLlms"),
			description: t("settings.debug.traceLlmsDesc"),
		},
		{
			key: "traceTraditional",
			label: t("settings.debug.traceTraditional"),
			description: t("settings.debug.traceTraditionalDesc"),
		},
		{
			key: "disableCache",
			label: t("settings.debug.disableCache"),
			description: t("settings.debug.disableCacheDesc"),
		},
	];

	const diagnostics = [
		{
			key: DIAGNOSTIC_KEYS.settings,
			title: t("settings.debug.exportSettings"),
			description: t("settings.debug.exportSettingsDesc"),
			action: runSettingsExport,
		},
		{
			key: DIAGNOSTIC_KEYS.queues,
			title: t("settings.debug.exportQueues"),
			description: t("settings.debug.exportQueuesDesc"),
			action: runQueueExport,
		},
		{
			key: DIAGNOSTIC_KEYS.ping,
			title: t("settings.debug.pingBackground"),
			description: t("settings.debug.pingBackgroundDesc"),
			action: runPing,
		},
		{
			key: DIAGNOSTIC_KEYS.cache,
			title: t("settings.debug.clearRpcCache"),
			description: t("settings.debug.clearRpcCacheDesc"),
			action: runCacheReset,
		},
	];

	const latencyValue = () => settings.debug.simulateLatencyMs;
	const loadingFor = (key: string) => Boolean(actionLoading()[key]);

	return (
		<SettingsCard navId={props.navId} title={t("settings.debug.title")}>
			<div class="space-y-6">
				<p class="text-sm text-base-content/70">
					{t("settings.debug.description")}
				</p>
				<div class="space-y-4">
					<For each={toggleConfig}>
						{(item) => (
							<SettingsToggle
								checked={settings.debug[item.key]}
								onChange={(event) =>
									setSettings("debug", item.key, event.currentTarget.checked)
								}
								label={item.label}
								helperText={item.description}
							/>
						)}
					</For>
					<NumberInput
						label={t("settings.debug.simulateLatency")}
						helperText={t("settings.debug.simulateLatencyDesc")}
						value={latencyValue()}
						min={0}
						max={3000}
						step={50}
						placeholder={t("settings.debug.simulateLatencyPlaceholder")}
						onInput={(event) => {
							const nextValue = Number(event.currentTarget.value);
							if (Number.isNaN(nextValue)) return;
							const clamped = Math.max(0, Math.min(3000, nextValue));
							setSettings("debug", "simulateLatencyMs", clamped);
						}}
					/>
				</div>
				<div class="space-y-3">
					<h3 class="text-base font-semibold">
						{t("settings.debug.actionsTitle")}
					</h3>
					<div class="grid gap-4 md:grid-cols-2">
						<For each={diagnostics}>
							{(diag) => (
								<div class="space-y-3 rounded-2xl border border-base-300/70 bg-base-100/80 p-4">
									<div>
										<p class="font-medium">{diag.title}</p>
										<p class="text-sm text-base-content/70">
											{diag.description}
										</p>
									</div>
									<div class="flex justify-end">
										<Button
											variant="info"
											size="sm"
											disabled={loadingFor(diag.key)}
											onClick={() => {
												void diag.action();
											}}
										>
											{loadingFor(diag.key) && (
												<span class="loading loading-spinner loading-xs" />
											)}
											<span>
												{loadingFor(diag.key)
													? t("common.processing")
													: diag.title}
											</span>
										</Button>
									</div>
								</div>
							)}
						</For>
					</div>
				</div>
				<Show when={feedback()}>
					{(entry) => (
						<Alert
							variant={
								entry().variant === "error"
									? "error"
									: entry().variant === "success"
										? "success"
										: "info"
							}
							closable
							class="text-sm"
						>
							{entry().message}
						</Alert>
					)}
				</Show>
			</div>
		</SettingsCard>
	);
};
