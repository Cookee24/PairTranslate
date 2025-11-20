import { type Component, type JSX, splitProps } from "solid-js";
import { cn } from "~/utils/cn";

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
				<div class="label mr-4">
					<span class="label-text">
						{local.label}
						{local.required && <span class="text-error ml-1">*</span>}
					</span>
				</div>
			)}
			{local.children}
			{(local.helperText || local.error) && (
				<div class="label text-wrap">
					<span class={cn("label-text-alt", local.error && "text-error")}>
						{local.error || local.helperText}
					</span>
				</div>
			)}
		</div>
	);
};
