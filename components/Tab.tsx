import { mergeRefs } from "@solid-primitives/refs";
import { type Component, type JSX, onMount, splitProps } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import {
	animatedHover,
	animateScaleDown,
	animateScaleUp,
} from "~/hooks/animation";
import { cn } from "~/utils/cn";

const tabVariants = tv({
	base: "tabs",
	variants: {
		variant: {
			default: "",
			bordered: "tabs-border",
			lifted: "tabs-lift",
			boxed: "tabs-box",
		},
		size: {
			xs: "tabs-xs",
			sm: "tabs-sm",
			md: "",
			lg: "tabs-lg",
			xl: "tabs-xl",
		},
		position: {
			top: "",
			bottom: "tabs-bottom",
		},
	},
	defaultVariants: {
		variant: "default",
		size: "md",
		position: "top",
	},
});

export interface TabProps
	extends JSX.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof tabVariants> {
	value?: string | number;
	defaultValue?: string | number;
	onValueChange?: (value: string | number) => void;
	hoverable?: boolean;
}

const TabRoot: Component<TabProps> = (props) => {
	const [local, divProps] = splitProps(props, [
		"value",
		"defaultValue",
		"onValueChange",
		"variant",
		"size",
		"position",
		"hoverable",
		"class",
		"ref",
		"children",
	]);

	let elementRef: HTMLDivElement | undefined;

	// Use custom hover animation for tabs
	onMount(() =>
		animatedHover(
			() => elementRef,
			() => !!local.hoverable,
			(el) => animateScaleUp(el),
			animateScaleDown,
		),
	);

	return (
		<div
			{...divProps}
			class={cn(
				tabVariants({
					variant: local.variant,
					size: local.size,
					position: local.position,
				}),
				local.class,
			)}
			ref={mergeRefs((el) => {
				elementRef = el;
			}, local.ref)}
		>
			{props.children}
		</div>
	);
};

const TabList: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	return <div {...props} role="tablist" class={cn(props.class)} />;
};

export interface TabButtonProps
	extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
	value: string | number;
	active?: boolean;
	disabled?: boolean;
}

const TabButton: Component<TabButtonProps> = (props) => {
	const [local, buttonProps] = splitProps(props, [
		"value",
		"active",
		"disabled",
		"class",
		"children",
	]);

	return (
		<button
			{...buttonProps}
			role="tab"
			aria-selected={local.active}
			aria-disabled={local.disabled}
			class={cn(
				"tab",
				local.active && "tab-active",
				local.disabled && "tab-disabled",
				local.class,
			)}
			disabled={local.disabled}
		>
			{local.children}
		</button>
	);
};

const TabContent: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	return (
		<div {...props} role="tabpanel" class={cn("tab-content", props.class)} />
	);
};

export const Tab = {
	Root: TabRoot,
	List: TabList,
	Button: TabButton,
	Content: TabContent,
};
