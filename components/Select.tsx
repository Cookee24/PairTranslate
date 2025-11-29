import {
	type Component,
	createSelector,
	For,
	type JSX,
	Show,
	splitProps,
} from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/utils/cn";

const selectVariants = tv({
	base: "select",
	variants: {
		variant: {
			primary: "select-primary",
			secondary: "select-secondary",
			accent: "select-accent",
			info: "select-info",
			success: "select-success",
			warning: "select-warning",
			error: "select-error",
		},
		size: {
			lg: "select-lg",
			md: "select-md",
			sm: "select-sm",
			xs: "select-xs",
		},
		error: {
			true: "select-error",
		},
		ghost: {
			true: "select-ghost",
		},
	},
	compoundVariants: [
		{
			ghost: false,
			class: "select-bordered",
		},
	],
});

export interface SelectOption {
	value: string | number;
	label: string | JSX.Element;
	disabled?: boolean;
}

export interface SelectProps
	extends Omit<JSX.SelectHTMLAttributes<HTMLSelectElement>, "size">,
		VariantProps<typeof selectVariants> {
	label?: string;
	helperText?: string;
	options?: SelectOption[];
	placeholder?: string;
}

export const Select: Component<SelectProps> = (props) => {
	const [local, selectProps] = splitProps(props, [
		"size",
		"variant",
		"label",
		"helperText",
		"error",
		"options",
		"placeholder",
		"class",
		"children",
		"ghost",
	]);

	const isSelected = createSelector(() => props.value);

	const SelectElement = () => (
		<select
			{...selectProps}
			class={cn(
				selectVariants({
					variant: local.variant,
					size: local.size,
					error: !!local.error,
					ghost: local.ghost,
				}),
				local.class,
			)}
		>
			{local.placeholder && (
				<option disabled selected value="">
					{local.placeholder}
				</option>
			)}
			<Show when={local.options} fallback={local.children}>
				<For each={local.options}>
					{(option) => (
						<option
							value={option.value}
							disabled={option.disabled}
							selected={isSelected(option.value)}
						>
							{option.label}
						</option>
					)}
				</For>
			</Show>
		</select>
	);

	if (local.label || local.helperText || local.error) {
		return (
			<fieldset class="form-control w-full">
				{local.label && (
					<legend class="label">
						<span class="label-text">{local.label}</span>
					</legend>
				)}
				<SelectElement />
				{(local.helperText || local.error) && (
					<div class="label">
						<span class={cn("label-text-alt", local.error && "text-error")}>
							{local.error || local.helperText}
						</span>
					</div>
				)}
			</fieldset>
		);
	}

	return <SelectElement />;
};
