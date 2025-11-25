import { type Component, type JSX, splitProps } from "solid-js";
import { cn } from "~/utils/cn";
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
	icon?: JSX.Element;
	suffix?: JSX.Element | string;
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
		"icon",
		"suffix",
	]);

	return (
		<FormField
			label={local.label}
			helperText={local.helperText}
			error={local.error}
			required={local.required}
			class={local.class}
		>
			<label
				class={cn(
					"input input-bordered flex items-center gap-2",
					local.error && "input-error",
				)}
			>
				{local.icon && <span class="text-base-content/70">{local.icon}</span>}
				<input
					{...inputProps}
					type="number"
					class="grow bg-transparent text-base-content focus:outline-none"
					min={local.min}
					max={local.max}
					step={local.step}
				/>
				{local.suffix && (
					<span class="badge badge-ghost text-xs">{local.suffix}</span>
				)}
			</label>
		</FormField>
	);
};
