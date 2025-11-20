import { Activity, Languages, ListOrdered, Loader } from "lucide-solid";
import { createMemo, createSignal, Show } from "solid-js";
import { Badge } from "~/components/Badge";
import { Loading } from "~/components/Loading";
import { createAnimatedAppearance } from "~/hooks/animation";
import { useProgressIndicator } from "~/hooks/progress-indicator";
import { useSettings } from "~/hooks/settings";
import { t } from "~/utils/i18n";

export default function ProgressIndicator() {
	const { settings } = useSettings();
	const progress = useProgressIndicator();
	const [ref, setRef] = createSignal<HTMLDivElement>();

	const queueStatus = createMemo(() => progress.status());
	const activeService = createMemo(() => {
		const status = queueStatus();
		const modelId = status?.modelId ?? progress.modelId();
		if (!modelId) return undefined;
		return {
			id: modelId,
			service: settings.services[modelId],
		};
	});
	const modelLabel = createMemo(() => {
		const current = activeService();
		if (!current) return null;
		return current.service?.name || current.id;
	});
	const backgroundProgress = createMemo(() => {
		const status = queueStatus();
		if (!status) return null;
		if (status.tokensPerMinute <= 0) return null;
		const used = status.tokensPerMinute - status.tokensAvailable;
		return Math.max(0, Math.min(1, used / status.tokensPerMinute));
	});
	const backgroundWidth = createMemo(
		() => `${Math.round((backgroundProgress() ?? 0) * 100)}%`,
	);
	const runningValue = createMemo(() => {
		const status = queueStatus();
		if (!status) return "--/--";
		return `${status.running}/${status.requestConcurrency}`;
	});
	const queuedValue = createMemo(() => {
		const status = queueStatus();
		if (!status) return "--";
		return status.queued.toString();
	});

	const visible = createMemo(
		() =>
			settings.basic.progressIndicationEnabled &&
			progress.counter() > 0 &&
			Boolean(modelLabel()),
	);
	const shouldRender = createAnimatedAppearance(ref, visible);

	return (
		<Show when={shouldRender()}>
			<div
				ref={setRef}
				aria-live="polite"
				aria-atomic="true"
				class="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] select-none rounded-full border border-base-200/70 bg-base-100/95 px-3 py-2 text-xs shadow-lg backdrop-blur-lg"
			>
				<div
					class="pointer-events-none absolute inset-0 rounded-full bg-base-200/40"
					aria-hidden="true"
				/>
				<div
					class="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
					aria-hidden="true"
				>
					<div
						class="absolute inset-y-0 left-0 bg-primary/15 transition-[width] duration-300 ease-out"
						style={{ width: backgroundWidth() }}
					/>
				</div>

				<div class="relative flex items-center gap-3">
					<div class="flex items-center gap-2 text-primary">
						<div class="rounded-full border border-primary/30 bg-primary/10 p-1.5">
							<Languages size={14} />
						</div>
						<div class="flex items-center gap-1 text-base-content">
							<Loading size="xs" variant="primary" />
							<span class="max-w-[120px] truncate text-[11px] font-semibold">
								{modelLabel()}
							</span>
						</div>
					</div>
					<div class="flex flex-wrap items-center gap-1 text-xs">
						<Badge
							class="gap-1 px-2"
							variant="primary"
							size="xs"
							pulse
							title={t("common.translationTasks")}
						>
							<Loader size={10} class="animate-spin" />
							<span class="font-semibold tabular-nums">
								{progress.counter()}
							</span>
						</Badge>
						<Badge
							class="gap-1 px-2"
							variant="secondary"
							size="xs"
							title={t("common.running")}
						>
							<Activity size={10} />
							<span class="font-semibold tabular-nums">{runningValue()}</span>
						</Badge>
						<Badge
							class="gap-1 px-2"
							variant="neutral"
							size="xs"
							title={t("common.queue")}
						>
							<ListOrdered size={10} />
							<span class="font-semibold tabular-nums">{queuedValue()}</span>
						</Badge>
					</div>
				</div>
			</div>
		</Show>
	);
}
