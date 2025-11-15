import type { Component, JSX } from "solid-js";

export interface FormGridProps {
	children: JSX.Element;
	cols?: 1 | 2 | 3 | 4;
	gap?: "sm" | "md" | "lg";
	class?: string;
}

export const FormGrid: Component<FormGridProps> = (props) => {
	const gridClasses = cn(
		"grid",
		{
			"grid-cols-1": props.cols === 1,
			"grid-cols-1 md:grid-cols-2": props.cols === 2 || !props.cols,
			"grid-cols-1 md:grid-cols-2 lg:grid-cols-3": props.cols === 3,
			"grid-cols-1 md:grid-cols-2 lg:grid-cols-4": props.cols === 4,
		},
		{
			"gap-2": props.gap === "sm",
			"gap-4": props.gap === "md" || !props.gap,
			"gap-6": props.gap === "lg",
		},
		props.class,
	);

	return <div class={gridClasses}>{props.children}</div>;
};
