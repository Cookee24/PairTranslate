import { type Component, type JSX, splitProps } from "solid-js";
import { cn } from "../../../../utils/cn";
import { FormField } from "./FormField";

export interface NumberInputProps
	extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "size"> {
	label?: string;
	helperText?: string;
	error?: string;
	required?: boolean;
	min?: number;
	max?: number;
	step?: number;
}

export const NumberInput: Component<NumberInputProps> = (props) => {
	const [local, inputProps] = splitProps(props, [
		"label",
		"helperText",
		"error",
		"required",
		"min",
		"max",
		"step",
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
			<input
				{...inputProps}
				type="number"
				class={cn(
					"input input-bordered w-full",
					local.error && "input-error",
					props.class,
				)}
				min={local.min}
				max={local.max}
				step={local.step}
			/>
		</FormField>
	);
};
