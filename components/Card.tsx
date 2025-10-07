import { mergeRefs } from "@solid-primitives/refs";
import { animate, hover } from "motion";
import {
	type Component,
	createEffect,
	type JSX,
	onCleanup,
	splitProps,
} from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/utils/cn";

const cardVariants = tv({
	base: "card",
	variants: {
		variant: {
			bordered: "card-bordered",
			compact: "card-compact",
			normal: "card-normal",
			side: "card-side",
			"image-full": "image-full",
		},
		shadow: {
			true: "shadow-xl",
		},
	},
});

export interface CardProps
	extends JSX.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof cardVariants> {
	hoverable?: boolean;
	title?: string;
	actions?: JSX.Element;
	figure?: JSX.Element;
}

const CardRoot: Component<CardProps> = (props) => {
	const [local, divProps] = splitProps(props, [
		"variant",
		"hoverable",
		"shadow",
		"class",
		"children",
		"ref",
	]);

	let elementRef: HTMLDivElement | undefined;

	// Use custom hover animation for cards
	createEffect(() => {
		if (!elementRef || !local.hoverable) return;

		onCleanup(
			hover(elementRef, (el) => {
				animate(el, { scale: 1.02, y: -4 });
				return () => animate(el, { scale: 1, y: 0 });
			}),
		);
	});

	return (
		<div
			{...divProps}
			class={cn(
				cardVariants({ variant: local.variant, shadow: local.shadow }),
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

const CardFigure: Component<JSX.HTMLAttributes<HTMLElement>> = (props) => {
	return <figure {...props} />;
};

// Additional Card sub-components for more flexibility
const CardBody: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	return <div {...props} class={cn("card-body", props.class)} />;
};

const CardTitle: Component<JSX.HTMLAttributes<HTMLHeadingElement>> = (
	props,
) => {
	return <h2 {...props} class={cn("card-title", props.class)} />;
};

const CardActions: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	return <div {...props} class={cn("card-actions", props.class)} />;
};

export const Card = {
	Root: CardRoot,
	Figure: CardFigure,
	Body: CardBody,
	Title: CardTitle,
	Actions: CardActions,
};
