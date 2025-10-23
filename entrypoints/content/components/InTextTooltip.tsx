import { ClipboardCopy, RotateCcw, Trash2 } from "lucide-solid";

interface Props {
	pos?: { x: number; y: number };
	error?: string;
	loading?: boolean;
	onClose?: () => void;
	onRetry?: () => void;
	onCopyMarkdown?: () => void;
	onDelete?: () => void;
}
export default (props: Props) => {
	const show = () => props.pos !== undefined;
	const [ref, setRef] = createSignal<HTMLDivElement>();
	const shouldRender = createAnimatedAppearance(ref, show);

	// Calculate position based on center position, and clamp to viewport
	const pos = createMemo(() => {
		const element = ref();

		const cx = props.pos?.x ?? 0;
		const cy = props.pos?.y ?? 0;

		if (!element) return { x: cx, y: cy };

		const rect = element.getBoundingClientRect();
		const padding = 8; // padding from viewport edge

		// Center the tooltip on the center position
		let x = cx - rect.width / 2;
		let y = cy - rect.height - 10; // 10px above the center

		// Clamp to viewport
		const maxX = window.innerWidth - rect.width - padding;
		const maxY = window.innerHeight - rect.height - padding;

		x = Math.max(padding, Math.min(x, maxX));
		y = Math.max(padding, Math.min(y, maxY));

		// If tooltip would be above viewport, show it below the center position instead
		if (cy - rect.height - 10 < padding) {
			y = cy + 10;
		}

		return { x, y };
	});

	const [shouldListenClose, setShouldListenClose] = createSignal(false);
	let timeoutHandle: NodeJS.Timeout | undefined;
	createEffect(() => {
		if (shouldRender()) {
			// Delay enabling outer click listening to avoid immediate close
			timeoutHandle && clearTimeout(timeoutHandle);
			timeoutHandle = setTimeout(() => {
				setShouldListenClose(true);
			}, 300);

			onCleanup(() => {
				timeoutHandle && clearTimeout(timeoutHandle);
				setShouldListenClose(false);
			});
		}
	});

	onOuterClick(ref, () => props.onClose?.(), shouldListenClose);
	createEffect(() => {
		const ref_ = ref();
		if (!ref_) return;
		if (!shouldListenClose()) return;

		const onClose = () => props.onClose?.();

		window.addEventListener("scroll", onClose, true);
		onCleanup(() => {
			window.removeEventListener("scroll", onClose, true);
		});
	});

	createEffect(() => {
		const ref_ = ref();
		if (!ref_) return;
		if (!props.pos) return;

		ref_.style.left = `${pos().x}px`;
		ref_.style.top = `${pos().y}px`;
	});

	return (
		<Show when={shouldRender()}>
			<Menu.Root
				class="fixed bg-accent rounded-md shadow-lg gap-1"
				orientation="vertical"
				size="sm"
				ref={setRef}
			>
				<Menu.Item
					class="tooltip tooltip-right"
					data-tip={props.error ?? t("actions.retry")}
				>
					<Button
						variant={props.error ? "error" : "ghost"}
						size="xs"
						disabled={props.loading}
						onClick={props.onRetry}
					>
						<RotateCcw size={16} />
					</Button>
				</Menu.Item>
				<Menu.Item
					class="tooltip tooltip-right"
					data-tip={t("actions.copyAsMarkdown")}
				>
					<Button
						variant="ghost"
						size="xs"
						disabled={props.loading || !!props.error}
						onClick={props.onCopyMarkdown}
					>
						<ClipboardCopy size={16} />
					</Button>
				</Menu.Item>
				<Menu.Item class="tooltip tooltip-right" data-tip={t("actions.delete")}>
					<Button variant="warning" size="xs" onClick={props.onDelete}>
						<Trash2 size={16} />
					</Button>
				</Menu.Item>
			</Menu.Root>
		</Show>
	);
};
