import type { Component, JSX } from "solid-js";
import { createSignal, onCleanup, onMount, splitProps } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/utils/cn";

const tooltipVariants = tv({
	base: "tooltip",
	variants: {
		position: {
			top: "tooltip-top",
			bottom: "tooltip-bottom",
			left: "tooltip-left",
			right: "tooltip-right",
		},
		color: {
			primary: "tooltip-primary",
			secondary: "tooltip-secondary",
			accent: "tooltip-accent",
			info: "tooltip-info",
			success: "tooltip-success",
			warning: "tooltip-warning",
			error: "tooltip-error",
		},
		open: {
			true: "tooltip-open",
		},
	},
});

export interface TooltipProps extends VariantProps<typeof tooltipVariants> {
	content: string;
	trigger?: "hover" | "click";
	class?: string;
	children: JSX.Element;
}

export const Tooltip: Component<TooltipProps> = (props) => {
	const [local, rest] = splitProps(props, [
		"content",
		"trigger",
		"position",
		"color",
		"open",
		"children",
		"class",
	]);

	const [isClickedOpen, setIsClickedOpen] = createSignal(false);

	let tooltipRef: HTMLButtonElement | undefined;

	const handleClickOutside = (e: MouseEvent) => {
		if (tooltipRef && !tooltipRef.contains(e.target as Node)) {
			setIsClickedOpen(false);
		}
	};

	onMount(() => {
		if (local.trigger === "click") {
			document.addEventListener("click", handleClickOutside);
			onCleanup(() => {
				document.removeEventListener("click", handleClickOutside);
			});
		}
	});

	const handleTriggerClick = (e: MouseEvent) => {
		if (local.trigger === "click") {
			e.stopPropagation();
			setIsClickedOpen(!isClickedOpen());
		}
	};

	const handleTriggerKeyDown = (e: KeyboardEvent) => {
		if (local.trigger === "click" && (e.key === "Enter" || e.key === " ")) {
			e.preventDefault();
			setIsClickedOpen(!isClickedOpen());
		}
	};

	return (
		<button
			ref={tooltipRef}
			type="button"
			class={cn(
				tooltipVariants({
					position: local.position,
					color: local.color,
					open: local.open || (local.trigger === "click" && isClickedOpen()),
				}),
				local.class,
			)}
			data-tip={local.content}
			onClick={handleTriggerClick}
			onKeyDown={handleTriggerKeyDown}
			{...rest}
		>
			{local.children}
		</button>
	);
};
