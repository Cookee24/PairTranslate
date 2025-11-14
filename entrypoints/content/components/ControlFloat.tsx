import { animate } from "motion/mini";
import { getDomListener } from "../parser";

interface SelectionBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface Props {
	onSelection?: (elements: HTMLElement[]) => void;
}

export default (props: Props) => {
	const controlPressed = useModifierKeyStatus();
	const modifierKey = isApple() ? "Alt" : "Control";

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
			let otherKeysPressed = false;
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
				if (e.key !== modifierKey) {
					otherKeysPressed = true;
				}
			};

			window.addEventListener("mousedown", handleMouseDown);
			window.addEventListener("mouseup", handleMouseUp);
			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("blur", handleBlur);
			window.addEventListener("keydown", handleOtherKeys, { passive: true });
			onCleanup(() => {
				// If mouse is never clicked (just modifier key pressed), do a point selection
				if (!isDragging() && !otherKeysPressed) {
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

		boxRef_.style.left = `${boxPos_.x - window.scrollX}px`;
		boxRef_.style.top = `${boxPos_.y - window.scrollY}px`;
		boxRef_.style.width = `${boxPos_.width}px`;
		boxRef_.style.height = `${boxPos_.height}px`;
	});

	return (
		<Show when={shouldRender()}>
			<div
				class="w-8 h-8 bg-primary/80 rounded-full -translate-1/2"
				style={{
					position: "fixed",
					left: `${pos().x}px`,
					top: `${pos().y}px`,
				}}
				ref={setRef}
			/>
			<Show when={shouldRenderBox()}>
				<div
					class="pointer-events-none fixed border-2 border-base-300 bg-secondary/50 rounded-md"
					ref={setBoxRef}
				/>
			</Show>
		</Show>
	);
};

const elementsInBox = async (box: SelectionBox) => {
	const listener = getDomListener(window.location.hostname, {
		judgeFns: [
			(element) => {
				const rect = element.getBoundingClientRect();
				const elementX = rect.x + window.scrollX;
				const elementY = rect.y + window.scrollY;

				// Check if rectangles intersect
				return (
					elementX < box.x + box.width &&
					elementX + rect.width > box.x &&
					elementY < box.y + box.height &&
					elementY + rect.height > box.y
				);
			},
		],
		listenNew: false,
	});

	const result: HTMLElement[] = [];
	(async () => {
		for await (const element of listener) {
			result.push(element);
		}
	})();

	await new Promise((r) => setTimeout(r, 200));
	listener.return();

	return result;
};
