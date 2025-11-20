import { mergeRefs } from "@solid-primitives/refs";
import { type Component, type JSX, onMount, splitProps } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import {
	animatedHover,
	animateScaleDown,
	animateScaleUp,
} from "~/hooks/animation";
import { cn } from "~/utils/cn";

const statsVariants = tv({
	base: "stats",
	variants: {
		orientation: {
			horizontal: "stats-horizontal",
			vertical: "stats-vertical",
		},
		shadow: {
			true: "shadow",
		},
		responsive: {
			true: "stats-vertical lg:stats-horizontal",
		},
	},
	defaultVariants: {
		orientation: "horizontal",
		shadow: true,
	},
});

const statVariants = tv({
	base: "stat",
	variants: {
		centered: {
			true: "place-items-center",
		},
	},
});

export interface StatsProps
	extends JSX.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof statsVariants> {
	hoverable?: boolean;
}

export interface StatProps
	extends JSX.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof statVariants> {
	hoverable?: boolean;
}

const StatsRoot: Component<StatsProps> = (props) => {
	const [local, divProps] = splitProps(props, [
		"orientation",
		"shadow",
		"responsive",
		"hoverable",
		"class",
		"ref",
		"children",
	]);

	let elementRef: HTMLDivElement | undefined;

	// Use custom hover animation for stats root
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
				statsVariants({
					orientation: local.responsive ? undefined : local.orientation,
					shadow: local.shadow,
					responsive: local.responsive,
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

const Stat: Component<StatProps> = (props) => {
	const [local, divProps] = splitProps(props, [
		"centered",
		"hoverable",
		"class",
		"ref",
		"children",
	]);

	let elementRef: HTMLDivElement | undefined;

	// Use custom hover animation for stat items
	onMount(() =>
		animatedHover(
			() => elementRef,
			() => !!local.hoverable,
		),
	);

	return (
		<div
			{...divProps}
			class={cn(statVariants({ centered: local.centered }), local.class)}
			ref={mergeRefs((el) => {
				elementRef = el;
			}, local.ref)}
		>
			{props.children}
		</div>
	);
};

const StatFigure: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	return <div {...props} class={cn("stat-figure", props.class)} />;
};

const StatTitle: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	return <div {...props} class={cn("stat-title", props.class)} />;
};

const StatValue: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	return <div {...props} class={cn("stat-value", props.class)} />;
};

const StatDesc: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	return <div {...props} class={cn("stat-desc", props.class)} />;
};

const StatActions: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	return <div {...props} class={cn("stat-actions", props.class)} />;
};

export const Stats = {
	Root: StatsRoot,
	Stat: Stat,
	Figure: StatFigure,
	Title: StatTitle,
	Value: StatValue,
	Desc: StatDesc,
	Actions: StatActions,
};
