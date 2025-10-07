import { type Component, type JSX, splitProps } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/utils/cn";

const inputVariants = tv({
	base: "input",
	variants: {
		variant: {
			neutral: "input-neutral",
			primary: "input-primary",
			secondary: "input-secondary",
			accent: "input-accent",
			info: "input-info",
			success: "input-success",
			warning: "input-warning",
			error: "input-error",
			ghost: "input-ghost",
		},
		size: {
			xl: "input-xl",
			lg: "input-lg",
			md: "input-md",
			sm: "input-sm",
			xs: "input-xs",
		},
		error: {
			true: "input-error",
		},
	},
	defaultVariants: {
		variant: "neutral",
		size: "md",
	},
});

export interface InputProps
	extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "size">,
		VariantProps<typeof inputVariants> {
	label?: string;
	helperText?: string;
}

export const Input: Component<InputProps> = (props) => {
	const [local, inputProps] = splitProps(props, [
		"size",
		"variant",
		"label",
		"helperText",
		"error",
		"class",
	]);

	const InputElement = () => (
		<input
			{...inputProps}
			class={cn(
				inputVariants({
					variant: local.variant,
					size: local.size,
					error: !!local.error,
				}),
				local.class,
			)}
		/>
	);

	if (local.label || local.helperText || local.error) {
		return (
			<div class="form-control w-full">
				{local.label && (
					<div class="label">
						<span class="label-text">{local.label}</span>
					</div>
				)}
				<InputElement />
				{(local.helperText || local.error) && (
					<div class="label">
						<span class={`label-text-alt ${local.error ? "text-error" : ""}`}>
							{local.error || local.helperText}
						</span>
					</div>
				)}
			</div>
		);
	}

	return <InputElement />;
};
