import { type Component, type JSX, splitProps } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/utils/cn";

const loadingVariants = tv({
	base: "loading",
	variants: {
		type: {
			spinner: "loading-spinner",
			dots: "loading-dots",
			ring: "loading-ring",
			ball: "loading-ball",
			bars: "loading-bars",
			infinity: "loading-infinity",
		},
		size: {
			xs: "loading-xs",
			sm: "loading-sm",
			md: "loading-md",
			lg: "loading-lg",
			xl: "loading-xl",
		},
		variant: {
			default: "",
			primary: "text-primary",
			secondary: "text-secondary",
			accent: "text-accent",
			neutral: "text-neutral",
			info: "text-info",
			success: "text-success",
			warning: "text-warning",
			error: "text-error",
		},
	},
	defaultVariants: {
		type: "spinner",
		size: "md",
		variant: "default",
	},
});

export interface LoadingProps
	extends JSX.HTMLAttributes<HTMLSpanElement>,
		VariantProps<typeof loadingVariants> {}

export const Loading: Component<LoadingProps> = (props) => {
	const [local, spanProps] = splitProps(props, [
		"type",
		"size",
		"variant",
		"class",
	]);

	return (
		<span
			{...spanProps}
			class={cn(
				loadingVariants({
					type: local.type,
					size: local.size,
					variant: local.variant,
				}),
				local.class,
			)}
		/>
	);
};
