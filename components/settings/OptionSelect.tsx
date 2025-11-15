import { type Component, type JSX, splitProps } from "solid-js";
import { FormField } from "./FormField";

export interface SelectOption {
	value: string | number;
	label: string | JSX.Element;
	disabled?: boolean;
}

export interface OptionSelectProps
	extends Omit<JSX.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
	label?: string;
	helperText?: string;
	error?: string;
	required?: boolean;
	options?: SelectOption[];
	placeholder?: string;
}

export const OptionSelect: Component<OptionSelectProps> = (props) => {
	const [local, selectProps] = splitProps(props, [
		"label",
		"helperText",
		"error",
		"required",
		"options",
		"placeholder",
		"class",
	]);

	return (
		<FormField
			label={local.label}
			helperText={local.helperText}
			error={local.error}
			required={local.required}
			class={local.class}
		>
			<select
				{...selectProps}
				class={cn(
					"select select-bordered w-full",
					local.error && "select-error",
					props.class,
				)}
			>
				{local.placeholder && (
					<option disabled selected value="">
						{local.placeholder}
					</option>
				)}
				{local.options?.map((option) => (
					<option
						value={option.value}
						disabled={option.disabled}
						selected={selectProps.value === option.value}
					>
						{option.label}
					</option>
				))}
				{props.children}
			</select>
		</FormField>
	);
};
