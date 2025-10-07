import { type Component, type JSX, splitProps } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/utils/cn";

const skeletonVariants = tv({
	base: "skeleton animate-pulse",
	variants: {
		shape: {
			rectangle: "",
			circle: "rounded-full",
			text: "",
		},
		size: {
			xs: "h-4 w-16",
			sm: "h-6 w-20",
			md: "h-8 w-24",
			lg: "h-12 w-32",
			xl: "h-16 w-40",
			"2xl": "h-20 w-48",
			avatar: "h-12 w-12",
			"avatar-lg": "h-16 w-16",
			square: "h-32 w-32",
			full: "h-32 w-full",
		},
	},
	compoundVariants: [
		{
			shape: "circle",
			size: "avatar",
			class: "h-12 w-12",
		},
		{
			shape: "circle",
			size: "avatar-lg",
			class: "h-16 w-16",
		},
		{
			shape: "text",
			size: "xs",
			class: "h-3 w-16",
		},
		{
			shape: "text",
			size: "sm",
			class: "h-4 w-20",
		},
		{
			shape: "text",
			size: "md",
			class: "h-4 w-28",
		},
		{
			shape: "text",
			size: "lg",
			class: "h-5 w-32",
		},
		{
			shape: "text",
			size: "full",
			class: "h-4 w-full",
		},
	],
	defaultVariants: {
		shape: "rectangle",
		size: "md",
	},
});

export interface SkeletonProps
	extends JSX.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof skeletonVariants> {
	width?: string | number;
	height?: string | number;
}

export const Skeleton: Component<SkeletonProps> = (props) => {
	const [local, divProps] = splitProps(props, [
		"shape",
		"size",
		"width",
		"height",
		"class",
		"style",
	]);

	const customStyle = () => {
		const style: Record<string, string> = {};
		if (local.width) {
			style.width =
				typeof local.width === "number" ? `${local.width}px` : local.width;
		}
		if (local.height) {
			style.height =
				typeof local.height === "number" ? `${local.height}px` : local.height;
		}
		return {
			...style,
			...(typeof local.style === "object" && local.style !== null
				? local.style
				: {}),
		};
	};

	return (
		<div
			{...divProps}
			class={cn(
				skeletonVariants({
					shape: local.shape,
					size: local.size,
				}),
				local.class,
			)}
			style={customStyle()}
		/>
	);
};
