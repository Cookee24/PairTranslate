import { type Component, type JSX, splitProps } from "solid-js";

export interface SettingsToggleProps
	extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "size"> {
	label?: string;
	helperText?: string;
	error?: string;
}

export const SettingsToggle: Component<SettingsToggleProps> = (props) => {
	const [local, toggleProps] = splitProps(props, [
		"label",
		"helperText",
		"error",
	]);

	return (
		<Toggle
			{...toggleProps}
			label={local.label}
			helperText={local.error || local.helperText}
			error={local.error ? Boolean(local.error) : undefined}
		/>
	);
};
