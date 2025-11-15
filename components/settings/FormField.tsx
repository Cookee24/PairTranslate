import { type Component, type JSX, splitProps } from "solid-js";

export interface FormFieldProps {
	label?: string;
	helperText?: string;
	error?: string;
	required?: boolean;
	class?: string;
	children: JSX.Element;
}

export const FormField: Component<FormFieldProps> = (props) => {
	const [local, divProps] = splitProps(props, [
		"label",
		"helperText",
		"error",
		"required",
		"class",
		"children",
	]);

	return (
		<div class={cn("form-control w-full", local.class)} {...divProps}>
			{local.label && (
				<div class="label">
					<span class="label-text">
						{local.label}
						{local.required && <span class="text-error ml-1">*</span>}
					</span>
				</div>
			)}
			{local.children}
			{(local.helperText || local.error) && (
				<div class="label">
					<span class={cn("label-text-alt", local.error && "text-error")}>
						{local.error || local.helperText}
					</span>
				</div>
			)}
		</div>
	);
};
