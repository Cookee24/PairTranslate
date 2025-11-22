import { type Component, type JSX, Show, splitProps } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/utils/cn";

const fieldsetVariants = tv({
	base: "fieldset",
	variants: {
		variant: {
			default: "",
			bordered: "border border-base-300",
			filled: "bg-base-200",
			elevated: "bg-base-100 shadow-md",
		},
		size: {
			sm: "p-3",
			md: "p-4",
			lg: "p-6",
		},
		rounded: {
			none: "",
			sm: "rounded-selector",
			md: "rounded-field",
			lg: "rounded-box",
			box: "rounded-box",
		},
	},
	defaultVariants: {
		variant: "default",
		size: "md",
		rounded: "none",
	},
});

const legendVariants = tv({
	base: "fieldset-legend",
	variants: {
		size: {
			sm: "text-sm",
			md: "text-base",
			lg: "text-lg",
		},
	},
	defaultVariants: {
		size: "md",
	},
});

export interface FieldsetProps
	extends JSX.FieldsetHTMLAttributes<HTMLFieldSetElement>,
		VariantProps<typeof fieldsetVariants> {
	legend?: string;
	description?: string;
	legendSize?: VariantProps<typeof legendVariants>["size"];
}

export const Fieldset: Component<FieldsetProps> = (props) => {
	const [local, fieldsetProps] = splitProps(props, [
		"legend",
		"description",
		"legendSize",
		"variant",
		"size",
		"rounded",
		"class",
		"children",
	]);

	return (
		<fieldset
			{...fieldsetProps}
			class={cn(
				fieldsetVariants({
					variant: local.variant,
					size: local.size,
					rounded: local.rounded,
				}),
				local.class,
			)}
		>
			<Show when={local.legend}>
				<legend
					class={legendVariants({
						size: local.legendSize || local.size,
					})}
				>
					{local.legend}
				</legend>
			</Show>
			{local.children}
			<Show when={local.description}>
				<p class="label text-sm text-base-content/70 mt-2">
					{local.description}
				</p>
			</Show>
		</fieldset>
	);
};
