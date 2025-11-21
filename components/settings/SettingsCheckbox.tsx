import { type Component, type JSX, splitProps } from "solid-js";
import { Checkbox } from "~/components/Checkbox";

export interface SettingsCheckboxProps
	extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "size"> {
	label?: string;
	helperText?: string;
	error?: string;
}

export const SettingsCheckbox: Component<SettingsCheckboxProps> = (props) => {
	const [local, checkboxProps] = splitProps(props, [
		"label",
		"helperText",
		"error",
	]);

	return (
		<Checkbox
			{...checkboxProps}
			label={local.label}
			helperText={local.error || local.helperText}
			error={local.error ? Boolean(local.error) : undefined}
		/>
	);
};
