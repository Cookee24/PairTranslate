import { type Component, type JSX, splitProps } from "solid-js";
import { Toggle, type ToggleProps } from "~/components/Toggle";

export interface SettingsToggleProps
	extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "size"> {
	label?: string;
	helperText?: string;
	error?: string;
	variant?: ToggleProps["variant"];
}

export const SettingsToggle: Component<SettingsToggleProps> = (props) => {
	const [local, toggleProps] = splitProps(props, [
		"label",
		"helperText",
		"error",
		"variant",
	]);

	return (
		<Toggle
			{...toggleProps}
			variant={local.error ? "error" : (local.variant ?? "success")}
			label={local.label}
			helperText={local.error || local.helperText}
			error={local.error ? Boolean(local.error) : undefined}
		/>
	);
};
