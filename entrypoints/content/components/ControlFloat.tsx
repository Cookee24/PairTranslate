import { animate } from "motion";
import { getDomListener } from "../parser";
import type { ChainedGeneratorFn } from "../parser/types";

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
	const controlPressed = useControlKeyStatus();

	// Indicator
	const [ref, setRef] = createSignal<HTMLDivElement>();
	const pos = useMousePosition();
	const shouldRender = createAnimatedAppearance(ref, controlPressed);

	// Selection box
	const [boxRef, setBoxRef] = createSignal<HTMLDivElement>();
	const [boxPos, setBoxPos] = createSignal<SelectionBox>();

	const [isDragging, setIsDragging] = createSignal(false);
	const [startPos, setStartPos] = createSignal<{ x: number; y: number }>();
	const shouldRenderBox = createAnimatedAppearance(
		boxRef,
		isDragging,
		(el) => animate(el, { opacity: [0, 1] }, { duration: 0.2 }),
		(el) => animate(el, { opacity: [1, 0] }, { duration: 0.2 }),
	);

	createEffect(() => {
		if (controlPressed()) {
			const handleMouseDown = (e: MouseEvent) => {
				setIsDragging(true);
				setStartPos({ x: e.clientX, y: e.clientY });
				setBoxPos({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
			};
			const handleMouseUp = async (_e: MouseEvent) => {
				const boxPos_ = boxPos();
				setIsDragging(false);
				setStartPos(undefined);
				setBoxPos(undefined);
				boxPos_ && elementsInBox(boxPos_).then(props.onSelection);
			};
			const handleMouseMove = (e: MouseEvent) => {
				const startPos_ = startPos();
				if (isDragging() && startPos_) {
					const start = startPos_;
					const currentX = e.clientX;
					const currentY = e.clientY;

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
				setStartPos(undefined);
			};

			window.addEventListener("mousedown", handleMouseDown);
			window.addEventListener("mouseup", handleMouseUp);
			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("blur", handleBlur);
			onCleanup(() => {
				setIsDragging(false);
				setBoxPos(undefined);
				window.removeEventListener("mousedown", handleMouseDown);
				window.removeEventListener("mouseup", handleMouseUp);
				window.removeEventListener("mousemove", handleMouseMove);
				window.removeEventListener("blur", handleBlur);
			});
		} else {
			untrack(() => {
				if (!isDragging()) {
					elementsInBox({
						x: pos().x,
						y: pos().y,
						width: 1,
						height: 1,
					}).then(props.onSelection);
				}
			});
		}
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
					style={{
						left: `${boxPos()?.x}px`,
						top: `${boxPos()?.y}px`,
						width: `${boxPos()?.width}px`,
						height: `${boxPos()?.height}px`,
					}}
					class="pointer-events-none fixed border-2 border-base-300 bg-secondary/50 rounded-md"
					ref={setBoxRef}
				/>
			</Show>
		</Show>
	);
};

const elementsInBox = async (box: SelectionBox) => {
	const intersectBoxFilter: ChainedGeneratorFn = async function* (
		_state,
		prev,
	) {
		for await (const element of prev) {
			const rect = element.getBoundingClientRect();
			// Check if rectangles intersect
			if (
				rect.x < box.x + box.width &&
				rect.x + rect.width > box.x &&
				rect.y < box.y + box.height &&
				rect.y + rect.height > box.y
			) {
				yield element;
			}
		}
	};

	const listener = getDomListener(window.location.hostname, {
		appendGenerators: [intersectBoxFilter],
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
