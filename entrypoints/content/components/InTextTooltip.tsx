import { ClipboardCopy, RotateCcw, Trash2 } from "lucide-solid";
import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import { Button } from "~/components/Button";
import { Menu } from "~/components/Menu";
import { createAnimatedAppearance, onOuterClick } from "~/hooks/animation";
import { t } from "~/utils/i18n";

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

	const [pos, setPos] = createSignal<{ x: number; y: number }>();
	createEffect(() => {
		const pos = props.pos;
		if (!pos) return;

		let w = 16,
			h = 16;
		const element = ref();
		if (element) {
			const rect = element.getBoundingClientRect();
			w = rect.width;
			h = rect.height;
		}

		const { x, y } = pos;

		const { innerWidth, innerHeight } = window;

		let posX = x - w / 2;
		let posY = y - h / 2;

		posX = Math.max(0, Math.min(posX, innerWidth - w));
		posY = Math.max(0, Math.min(posY, innerHeight - h));

		setPos({ x: posX, y: posY });
	});

	onOuterClick(ref, () => props.onClose?.(), show);
	createEffect(() => {
		const ref_ = ref();
		if (!ref_) return;

		const onClose = () => props.onClose?.();

		window.addEventListener("scroll", onClose, true);
		ref_.addEventListener("mouseleave", onClose, {
			passive: true,
			once: true,
		});
		onCleanup(() => {
			window.removeEventListener("scroll", onClose);
			ref_.removeEventListener("mouseleave", onClose);
		});
	});

	createEffect(() => {
		const ref_ = ref();
		if (!ref_) return;

		const pos_ = pos();
		if (!pos_) return;

		ref_.style.left = `${pos_.x}px`;
		ref_.style.top = `${pos_.y}px`;
	});

	return (
		<Show when={shouldRender()}>
			<Menu.Root
				class="fixed bg-accent rounded-md shadow-lg gap-1"
				orientation="vertical"
				size="sm"
				ref={setRef}
			>
				<Menu.Item>
					<Button
						class="tooltip tooltip-right"
						data-tip={t("actions.copyAsMarkdown")}
						variant="ghost"
						size="xs"
						disabled={props.loading || !!props.error}
						onClick={props.onCopyMarkdown}
					>
						<ClipboardCopy size={16} />
					</Button>
				</Menu.Item>
				<Menu.Item>
					<Button
						class="tooltip tooltip-right"
						data-tip={props.error ?? t("common.retry")}
						variant={props.error ? "error" : "ghost"}
						size="xs"
						disabled={props.loading}
						onClick={props.onRetry}
					>
						<RotateCcw size={16} />
					</Button>
				</Menu.Item>
				<Menu.Item class="tooltip tooltip-right" data-tip={t("common.delete")}>
					<Button variant="warning" size="xs" onClick={props.onDelete}>
						<Trash2 size={16} />
					</Button>
				</Menu.Item>
			</Menu.Root>
		</Show>
	);
};
