import { Check, Loader } from "lucide-solid";
import { spring } from "motion";
import { animate } from "motion/mini";
import { createEffect, createMemo, createSignal, Show } from "solid-js";
import { browser } from "#imports";
import { Button } from "~/components/Button";
import { animatedHover } from "~/hooks/animation";
import { useSettings } from "~/hooks/settings";
import { t } from "~/utils/i18n";

interface Props {
	translateEnabled?: boolean;
	onSwitch?: () => void;
}

// A small movement threshold in pixels to distinguish a click from a drag.
const DRAG_THRESHOLD = 5;

export default (props: Props) => {
	const { settings, setSettings } = useSettings();
	const [ref, setRef] = createSignal<HTMLDivElement>();
	const [top, setTop] = createSignal(0);
	const isLeft = createMemo(
		() => settings.basic.floatingBallPosition.side === "left",
	);

	const exitedState = () => (isLeft() ? "-50%" : "50%");
	const enter = (element: Element) =>
		animate(
			element,
			{ transform: `translateX(0)`, opacity: 1 },
			{ type: spring, bounce: 0, duration: 0.3 },
		);
	const exit = (element: Element) =>
		animate(
			element,
			{
				transform: `translateX(${exitedState()})`,
				opacity: 0.5,
			},
			{ type: spring, bounce: 0, duration: 0.3 },
		);
	animatedHover(ref, () => !isDragging(), enter, exit);

	const [isDragging, setIsDragging] = createSignal(false);

	let wasDragged = false;

	let startX = 0;
	let startY = 0;
	let initialTop = 0;

	createEffect(() => {
		setTop(settings.basic.floatingBallPosition.top);
	});

	const handleDragStart = (e: MouseEvent | TouchEvent) => {
		setIsDragging(true);
		wasDragged = false;
		e.preventDefault();

		const touch = "touches" in e;
		startX = touch ? e.touches[0].clientX : e.clientX;
		startY = touch ? e.touches[0].clientY : e.clientY;
		initialTop = top();

		document.documentElement.style.overflow = "hidden";
		document.body.style.userSelect = "none";
		document.body.style.cursor = "grabbing";
	};

	const handleDragMove = (e: MouseEvent | TouchEvent) => {
		if (!isDragging()) return;

		const touch = "touches" in e;
		const currentX = touch ? e.touches[0].clientX : e.clientX;
		const currentY = touch ? e.touches[0].clientY : e.clientY;

		if (!wasDragged) {
			const movedDistance = Math.sqrt(
				(currentX - startX) ** 2 + (currentY - startY) ** 2,
			);
			if (movedDistance > DRAG_THRESHOLD) {
				wasDragged = true;
			}
		}

		if (!wasDragged) {
			return;
		}

		const deltaY = currentY - startY;
		const deltaVh = (deltaY / window.innerHeight) * 100;
		let newTop = initialTop + deltaVh;

		const elementHeight = ref()?.clientHeight || 50;
		const elementHeightVh = (elementHeight / window.innerHeight) * 100;
		const maxTop = 100 - elementHeightVh;

		newTop = Math.max(0, Math.min(newTop, maxTop));

		setTop(newTop);
	};

	const handleDragEnd = () => {
		if (!isDragging()) return;
		setIsDragging(false);

		if (wasDragged) {
			setSettings("basic", "floatingBallPosition", "top", top());
		}

		const ref_ = ref();
		ref_ && exit(ref_);

		document.documentElement.style.overflow = "unset";
		document.body.style.userSelect = "auto";
		document.body.style.cursor = "auto";
	};

	createEffect(() => {
		if (isDragging()) {
			window.addEventListener("mousemove", handleDragMove);
			window.addEventListener("mouseup", handleDragEnd);
			window.addEventListener("touchmove", handleDragMove);
			window.addEventListener("touchend", handleDragEnd);
		} else {
			document.documentElement.style.overflow = "unset";
			window.removeEventListener("mousemove", handleDragMove);
			window.removeEventListener("mouseup", handleDragEnd);
			window.removeEventListener("touchmove", handleDragMove);
			window.removeEventListener("touchend", handleDragEnd);
		}
	});

	return (
		<div
			ref={setRef}
			class="fixed p-2 opacity-50"
			classList={{
				"left-0": isLeft(),
				"right-0": !isLeft(),
			}}
			style={{
				top: `${top()}vh`,
				transform: `translateX(${exitedState()})`,
			}}
		>
			<Button
				variant={props.translateEnabled ? "success" : "ghost"}
				onMouseDown={handleDragStart}
				onTouchStart={handleDragStart}
				onClick={() => {
					if (wasDragged) return;
					props.onSwitch?.();
				}}
				class="btn-circle shadow-lg relative self-end"
				classList={{ "cursor-grabbing": isDragging() }}
				size="sm"
			>
				<Show when={props.translateEnabled}>
					{/* TODO: replace with progress indicator */}
					{(() => 1)() === 1 ? (
						<Check
							class="p-1 bg-success text-success-content rounded-full"
							style={{
								position: "absolute",
								[isLeft() ? "right" : "left"]: "0",
								bottom: "0",
							}}
							size={12}
						/>
					) : (
						<Loader
							class="p-1 bg-accent text-accent-content rounded-full animate-spin"
							style={{
								position: "absolute",
								[isLeft() ? "right" : "left"]: "0",
								bottom: "0",
							}}
							size={12}
						/>
					)}
				</Show>
				<img
					src={browser.runtime.getURL("/icons/128.png")}
					alt={t("common.floatingBallIcon")}
				/>
			</Button>
		</div>
	);
};
