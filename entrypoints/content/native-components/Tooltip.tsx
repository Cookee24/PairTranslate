import type { JSX, ParentComponent } from "solid-js";
import { children, createEffect, createSignal, onCleanup } from "solid-js";
import { createAnimatedAppearance } from "~/hooks/animation";

interface TooltipProps {
	children?: JSX.Element;
	content?: JSX.Element;
	visible?: boolean;
}

export const NativeTooltip: ParentComponent<TooltipProps> = (props) => {
	const resolvedChildren = children(() => props.children);
	const [tooltipRef, setTooltipRef] = createSignal<HTMLElement>();
	const [isHovered, setIsHovered] = createSignal(false);
	const [position, setPosition] = createSignal({
		top: 0,
		left: 0,
	});

	const shouldRender = createAnimatedAppearance(tooltipRef, [
		isHovered,
		() => props.visible ?? true,
	]);

	const calculatePosition = (target: HTMLElement, tooltip: HTMLElement) => {
		const targetRect = target.getBoundingClientRect();
		const tooltipRect = tooltip.getBoundingClientRect();
		const viewport = {
			width: window.innerWidth,
			height: window.innerHeight,
		};

		const spacing = 8;
		let top = 0;
		let left = 0;

		// Try top first
		if (targetRect.top - tooltipRect.height - spacing >= 0) {
			top = targetRect.top - tooltipRect.height - spacing;
			left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
		}
		// Try bottom
		else if (
			targetRect.bottom + tooltipRect.height + spacing <=
			viewport.height
		) {
			top = targetRect.bottom + spacing;
			left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
		}
		// Try right
		else if (targetRect.right + tooltipRect.width + spacing <= viewport.width) {
			top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
			left = targetRect.right + spacing;
		}
		// Try left
		else if (targetRect.left - tooltipRect.width - spacing >= 0) {
			top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
			left = targetRect.left - tooltipRect.width - spacing;
		}
		// Fallback to top even if it doesn't fit
		else {
			top = targetRect.top - tooltipRect.height - spacing;
			left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
		}

		// Keep tooltip within viewport bounds
		left = Math.max(0, Math.min(left, viewport.width - tooltipRect.width));
		top = Math.max(0, Math.min(top, viewport.height - tooltipRect.height));

		return { top, left };
	};

	createEffect(() => {
		const child = resolvedChildren.toArray()[0] as HTMLElement;
		if (!child) return;

		const onMouseEnter = () => setIsHovered(true);
		const onMouseLeave = () => setIsHovered(false);
		child.addEventListener("mouseenter", onMouseEnter);
		child.addEventListener("mouseleave", onMouseLeave);
		onCleanup(() => {
			child.removeEventListener("mouseenter", onMouseEnter);
			child.removeEventListener("mouseleave", onMouseLeave);
			setIsHovered(false);
		});
	});

	createEffect(
		on(
			() => props.visible,
			(visible) => {
				visible || setIsHovered(false);
			},
		),
	);

	createEffect(() => {
		const tooltip = tooltipRef();
		const child = resolvedChildren.toArray()[0] as HTMLElement;

		if (tooltip && child && isHovered()) {
			const newPosition = calculatePosition(child, tooltip);
			setPosition(newPosition);
		}
	});

	return (
		<>
			{resolvedChildren()}
			<Show when={shouldRender()}>
				<div
					ref={setTooltipRef}
					style={{
						position: "fixed",
						top: `${position().top}px`,
						left: `${position().left}px`,
						"z-index": "1000",
						"background-color": "rgba(0, 0, 0, 0.8)",
						color: "white",
						padding: "6px 12px",
						"border-radius": "4px",
						"font-size": "14px",
						"font-weight": "normal",
						"pointer-events": "none",
						"max-width": "300px",
					}}
				>
					{props.content}
				</div>
			</Show>
		</>
	);
};
