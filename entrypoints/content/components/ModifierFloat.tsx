import { animate } from "motion/mini";
import {
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	Show,
} from "solid-js";
import { createAnimatedAppearance } from "~/hooks/animation";
import { createModifierKey } from "~/hooks/keyboard-shortcut";
import { useMousePosition } from "~/hooks/mouse";
import { useSettings } from "~/hooks/settings";
import type { DOMSection } from "~/utils/parser/types";
import {
	getElementsFromSelectionBox,
	type SelectionBox,
	shouldIncludeElementInSelectionBox,
} from "~/utils/selection";
import { getDomListener } from "../parser";

interface Props {
	onSelection?: (sections: DOMSection[]) => void;
}

export default (props: Props) => {
	const { settings } = useSettings();
	const modifierKey = createMemo(
		() => settings.basic.selectionTranslateModifier,
	);
	const controlPressed = createModifierKey(modifierKey);

	// Indicator
	const [ref, setRef] = createSignal<HTMLDivElement>();
	const pos = useMousePosition();
	const shouldRender = createAnimatedAppearance(ref, controlPressed);

	// Selection box
	const [boxRef, setBoxRef] = createSignal<HTMLDivElement>();
	const [boxPos, setBoxPos] = createSignal<SelectionBox>();

	const [isDragging, setIsDragging] = createSignal(false);
	let startPos: { x: number; y: number } | undefined;
	const shouldRenderBox = createAnimatedAppearance(
		boxRef,
		isDragging,
		(el) => animate(el, { opacity: [0, 1] }, { duration: 0.2 }),
		(el) => animate(el, { opacity: [1, 0] }, { duration: 0.2 }),
	);

	createEffect(() => {
		if (controlPressed()) {
			let noTriggerOnRelease = false;
			const handleMouseDown = (e: MouseEvent) => {
				setIsDragging(true);
				startPos = {
					x: e.clientX + window.scrollX,
					y: e.clientY + window.scrollY,
				};
				setBoxPos({
					x: e.clientX + window.scrollX,
					y: e.clientY + window.scrollY,
					width: 0,
					height: 0,
				});
			};
			const handleMouseUp = async (_e: MouseEvent) => {
				const boxPos_ = boxPos();
				setIsDragging(false);
				startPos = undefined;
				setBoxPos(undefined);
				noTriggerOnRelease = true;
				boxPos_ && elementsInBox(boxPos_).then(props.onSelection);
			};
			const handleMouseMove = (e: MouseEvent) => {
				if (isDragging() && startPos) {
					const start = startPos;
					const currentX = e.clientX + window.scrollX;
					const currentY = e.clientY + window.scrollY;

					const x = Math.min(start.x, currentX);
					const y = Math.min(start.y, currentY);
					const width = Math.abs(start.x - currentX);
					const height = Math.abs(start.y - currentY);

					setBoxPos({ x, y, width, height });
				}
			};
			const handleBlur = () => {
				setIsDragging(false);
				setBoxPos(undefined);
				startPos = undefined;
			};
			const handleOtherKeys = (e: KeyboardEvent) => {
				const currentModifier = modifierKey();
				if (currentModifier && e.key !== currentModifier) {
					noTriggerOnRelease = true;
				}
			};

			window.addEventListener("mousedown", handleMouseDown);
			window.addEventListener("mouseup", handleMouseUp);
			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("blur", handleBlur);
			window.addEventListener("keydown", handleOtherKeys, { passive: true });
			onCleanup(() => {
				// If mouse is never clicked (just modifier key pressed), do a point selection
				if (!isDragging() && !noTriggerOnRelease) {
					elementsInBox({
						x: pos().x + window.scrollX,
						y: pos().y + window.scrollY,
						width: 1,
						height: 1,
					}).then(props.onSelection);
				}
				setIsDragging(false);
				setBoxPos(undefined);
				window.removeEventListener("mousedown", handleMouseDown);
				window.removeEventListener("mouseup", handleMouseUp);
				window.removeEventListener("mousemove", handleMouseMove);
				window.removeEventListener("blur", handleBlur);
				window.removeEventListener("keydown", handleOtherKeys);
			});
		}
	});

	createEffect(() => {
		const boxRef_ = boxRef();
		if (!boxRef_) return;
		const boxPos_ = boxPos();
		if (!boxPos_) return;

		boxRef_.style.translate = `${boxPos_.x - window.scrollX}px ${boxPos_.y - window.scrollY}px`;
		boxRef_.style.width = `${boxPos_.width}px`;
		boxRef_.style.height = `${boxPos_.height}px`;
	});

	return (
		<Show when={shouldRender()}>
			<div
				class="w-8 h-8 bg-primary/80 rounded-full -translate-1/2"
				style={{
					position: "fixed",
					translate: `calc(${pos().x}px - 50%) calc(${pos().y}px - 50%)`,
				}}
				ref={setRef}
			/>
			<Show when={shouldRenderBox()}>
				<div
					class="pointer-events-none fixed border-2 border-base-300 bg-secondary/50 rounded-box"
					style={{
						translate: `${boxPos()?.x ?? 0 - window.scrollX}px ${boxPos()?.y ?? 0 - window.scrollY}px`,
						width: `${boxPos()?.width ?? 0}px`,
						height: `${boxPos()?.height ?? 0}px`,
					}}
					ref={setBoxRef}
				/>
			</Show>
		</Show>
	);
};

const elementsInBox = async (box: SelectionBox) => {
	const controller = new AbortController();
	const roots = getElementsFromSelectionBox(box);
	const listener = await getDomListener(window.location.hostname, {
		roots,
		judgeFn: (element) => shouldIncludeElementInSelectionBox(element, box),
		listenNew: false,
		filterInteractive: false,
		signal: controller.signal,
	});
	setTimeout(() => controller.abort(), 200);

	const result: DOMSection[] = [];
	for await (const section of listener) {
		result.push(section);
	}

	return result;
};
