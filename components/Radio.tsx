import { type Component, type JSX, splitProps } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/utils/cn";

const radioVariants = tv({
	base: "radio",
	variants: {
		variant: {
			primary: "radio-primary",
			secondary: "radio-secondary",
			accent: "radio-accent",
			info: "radio-info",
			success: "radio-success",
			warning: "radio-warning",
			error: "radio-error",
		},
		size: {
			lg: "radio-lg",
			md: "radio-md",
			sm: "radio-sm",
			xs: "radio-xs",
		},
		error: {
			true: "radio-error",
		},
	},
});

export interface RadioOption {
	value: string | number;
	label: string;
	disabled?: boolean;
}

// Omit 'size' and 'value' from the base input props to redefine them.
export interface RadioProps
	extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "size" | "value">,
		VariantProps<typeof radioVariants> {
	value?: string | number; // The currently selected value in the radio group.
	options: RadioOption[]; // The list of options to render.
	name: string; // 'name' is required to group radio buttons.
	label?: string;
	helperText?: string;
	horizontal?: boolean;
}

export const Radio: Component<RadioProps> = (props) => {
	const [local, inputProps] = splitProps(props, [
		"class",
		"error",
		"helperText",
		"horizontal",
		"label",
		"name",
		"options",
		"size",
		"value",
		"variant",
	]);

	return (
		<fieldset class={cn("form-control w-full", local.class)}>
			{local.label && (
				<legend class="label">
					<span class="label-text font-medium">{local.label}</span>
				</legend>
			)}
			<div class={cn("flex", local.horizontal ? "flex-row gap-4" : "flex-col")}>
				{local.options.map((option) => (
					<label class="label cursor-pointer justify-start gap-2">
						<span class="label-text">{option.label}</span>
						<input
							{...inputProps}
							type="radio"
							name={local.name}
							value={option.value}
							class={cn(
								radioVariants({
									variant: local.variant,
									size: local.size,
									error: !!local.error,
								}),
							)}
							disabled={option.disabled}
							checked={local.value === option.value}
						/>
					</label>
				))}
			</div>
			{(local.helperText || local.error) && (
				<div class="label">
					<span class={cn("label-text-alt", local.error && "text-error")}>
						{local.error || local.helperText}
					</span>
				</div>
			)}
		</fieldset>
	);
};
