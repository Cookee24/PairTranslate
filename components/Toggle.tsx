import { type Component, type JSX, splitProps } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/utils/cn";

const toggleVariants = tv({
	base: "toggle",
	variants: {
		variant: {
			primary: "toggle-primary",
			secondary: "toggle-secondary",
			accent: "toggle-accent",
			info: "toggle-info",
			success: "toggle-success",
			warning: "toggle-warning",
			error: "toggle-error",
		},
		size: {
			xl: "toggle-xl",
			lg: "toggle-lg",
			md: "toggle-md",
			sm: "toggle-sm",
			xs: "toggle-xs",
		},
		error: {
			true: "toggle-error",
		},
	},
});

export interface ToggleProps
	extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "size">,
		VariantProps<typeof toggleVariants> {
	label?: string;
	helperText?: string;
}

export const Toggle: Component<ToggleProps> = (props) => {
	const [local, inputProps] = splitProps(props, [
		"size",
		"variant",
		"label",
		"helperText",
		"error",
		"class",
	]);

	const toggleClasses = cn(
		toggleVariants({
			variant: local.variant,
			size: local.size,
			error: !!local.error,
		}),
		local.class,
	);

	if (local.label || local.helperText || local.error) {
		return (
			<div class="form-control w-fit">
				<label class="label cursor-pointer gap-3">
					<span class="label-text">{local.label}</span>
					<input {...inputProps} type="checkbox" class={toggleClasses} />
				</label>
				{(local.helperText || local.error) && (
					<>
						<br />
						<span
							class={cn(
								"label label-text-alt text-wrap",
								local.error && "text-error",
							)}
						>
							{local.error || local.helperText}
						</span>
					</>
				)}
			</div>
		);
	}

	return <input {...inputProps} type="checkbox" class={toggleClasses} />;
};
