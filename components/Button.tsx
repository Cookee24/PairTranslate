import { mergeRefs } from "@solid-primitives/refs";
import { type Component, type JSX, onMount, splitProps } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/utils/cn";

const buttonVariants = tv({
	base: "btn",
	variants: {
		variant: {
			neutral: "btn-neutral",
			primary: "btn-primary",
			secondary: "btn-secondary",
			accent: "btn-accent",
			ghost: "btn-ghost",
			link: "btn-link",
			info: "btn-info",
			success: "btn-success",
			warning: "btn-warning",
			error: "btn-error",
		},
		size: {
			lg: "btn-lg",
			md: "btn-md",
			sm: "btn-sm",
			xs: "btn-xs",
		},
		outline: {
			true: "btn-outline",
		},
		loading: {
			true: "btn-disabled",
		},
	},
	defaultVariants: {
		variant: "neutral",
		size: "md",
	},
});

export interface ButtonProps
	extends JSX.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	loading?: boolean;
	disabled?: boolean;
}

export const Button: Component<ButtonProps> = (props) => {
	const [local, buttonProps] = splitProps(props, [
		"ref",
		"size",
		"variant",
		"outline",
		"loading",
		"disabled",
		"class",
		"children",
	]);

	let elementRef: HTMLButtonElement | undefined;

	// Use animation hooks after element is mounted
	onMount(() => {
		animatedHover(
			() => elementRef,
			[() => !local.disabled, () => !local.loading],
		);
		animatedPress(
			() => elementRef,
			[() => !local.disabled, () => !local.loading],
		);
	});

	return (
		<button
			{...buttonProps}
			class={cn(
				buttonVariants({
					variant: local.variant,
					size: local.size,
					outline: local.outline,
					loading: local.loading,
				}),
				local.class,
			)}
			ref={mergeRefs((el) => {
				elementRef = el;
			}, local.ref)}
			disabled={local.disabled || local.loading}
		>
			{local.loading && <span class="loading loading-spinner" />}
			{local.children}
		</button>
	);
};
