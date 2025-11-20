import { Languages, Lightbulb } from "lucide-solid";
import { createEffect, createSignal, Show } from "solid-js";
import { Button } from "~/components/Button";
import { Menu } from "~/components/Menu";
import { createAnimatedAppearance, onOuterClick } from "~/hooks/animation";
import { useSettings } from "~/hooks/settings";
import { t } from "~/utils/i18n";
import { extractContextFromSelection } from "../context/select";
import type { Position, SelectEvent } from "../types";
import FloatTranslation from "./FloatTranslation";
import { usePopup } from "./Popup";

interface Props {
	event?: SelectEvent;
}

export default (props: Props) => {
	const [ref, setRef] = createSignal<HTMLElement>();
	let pos = { x: 0, y: 0 };
	const { addPopup } = usePopup();
	const { settings } = useSettings();

	const [show, setShow] = createSignal(false);
	const shouldRender = createAnimatedAppearance(ref, show);
	onOuterClick(ref, () => setShow(false), show);

	const setPosition = (eventPos: Position, ref: HTMLElement) => {
		const { innerWidth, innerHeight } = window;
		const { width, height } = ref.getBoundingClientRect();
		// Clamp to viewport
		pos = {
			x: Math.max(0, Math.min(eventPos.x + 10, innerWidth - width - 10)),
			y: Math.max(0, Math.min(eventPos.y + 10, innerHeight - height - 10)),
		};
		ref.style.position = "fixed";
		ref.style.left = `${pos.x}px`;
		ref.style.top = `${pos.y}px`;
	};

	const handleClick = async (action: "translate" | "explain") => {
		if (!props.event) return;
		setShow(false);

		const selection = props.event.selection;
		const textContext = extractContextFromSelection(selection);
		if (!textContext || !textContext.text) return;

		addPopup({
			...pos,
			pinned: settings.basic.autoPin,
			content: () => (
				<FloatTranslation mode={action} textContext={textContext} />
			),
		});
	};

	createEffect(() => {
		if (props.event) {
			setShow(true);
		}
	});

	createEffect(() => {
		if (props.event) {
			const ref_ = ref();
			if (!ref_) return;
			setPosition(props.event.position, ref_);
		}
	});

	return (
		<Show when={shouldRender()}>
			<Menu.Root
				ref={setRef}
				orientation="vertical"
				size="sm"
				rounded
				class="lg:menu-horizontal bg-base-200 text-base-content gap-2 shadow-md shadow-base-200"
			>
				<Menu.Item>
					<Button
						class="tooltip"
						variant="ghost"
						size="xs"
						onClick={() => handleClick("translate")}
						data-tip={t("actions.translate")}
					>
						<Languages size={16} />
					</Button>
				</Menu.Item>
				<Menu.Item>
					<Button
						class="tooltip"
						variant="ghost"
						size="xs"
						onClick={() => handleClick("explain")}
						data-tip={t("actions.explain")}
					>
						<Lightbulb size={16} />
					</Button>
				</Menu.Item>
			</Menu.Root>
		</Show>
	);
};
