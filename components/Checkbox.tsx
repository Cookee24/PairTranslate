import { mergeRefs } from "@solid-primitives/refs";
import { type Component, type JSX, splitProps } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { animatedFocus } from "~/hooks/animation";
import { cn } from "~/utils/cn";

const checkboxVariants = tv({
	base: "checkbox",
	variants: {
		variant: {
			neutral: "checkbox-neutral",
			primary: "checkbox-primary",
			secondary: "checkbox-secondary",
			accent: "checkbox-accent",
			info: "checkbox-info",
			success: "checkbox-success",
			warning: "checkbox-warning",
			error: "checkbox-error",
		},
		size: {
			lg: "checkbox-lg",
			md: "checkbox-md",
			sm: "checkbox-sm",
			xs: "checkbox-xs",
		},
		error: {
			true: "checkbox-error",
		},
	},
	defaultVariants: {
		variant: "neutral",
		size: "md",
	},
});

export interface CheckboxProps
	extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "size">,
		VariantProps<typeof checkboxVariants> {
	indeterminate?: boolean;
	label?: string;
	helperText?: string;
}

export const Checkbox: Component<CheckboxProps> = (props) => {
	const [local, inputProps] = splitProps(props, [
		"size",
		"variant",
		"indeterminate",
		"label",
		"helperText",
		"error",
		"class",
		"ref",
		"onFocus",
		"onBlur",
		"onChange",
	]);

	let inputRef: HTMLInputElement | undefined;

	// Use animation hooks for focus/blur
	animatedFocus(() => inputRef);

	const handleFocus = (
		e: FocusEvent & {
			currentTarget: HTMLInputElement;
			target: HTMLInputElement;
		},
	) => {
		if (typeof local.onFocus === "function") {
			local.onFocus(e);
		}
	};

	const handleBlur = (
		e: FocusEvent & {
			currentTarget: HTMLInputElement;
			target: HTMLInputElement;
		},
	) => {
		if (typeof local.onBlur === "function") {
			local.onBlur(e);
		}
	};

	const handleChange = (
		e: Event & {
			currentTarget: HTMLInputElement;
			target: HTMLInputElement;
		},
	) => {
		const target = e.target as HTMLInputElement;
		if (local.indeterminate) {
			target.indeterminate = !target.checked;
		}
		if (typeof local.onChange === "function") {
			local.onChange(e);
		}
	};

	return (
		<div class="form-control">
			<label class="label cursor-pointer">
				<span class="label-text">{local.label}</span>
				<input
					{...inputProps}
					type="checkbox"
					class={cn(
						checkboxVariants({
							variant: local.variant,
							size: local.size,
							error: !!local.error,
						}),
						local.class,
					)}
					onFocus={handleFocus}
					onBlur={handleBlur}
					onChange={handleChange}
					ref={mergeRefs((el) => {
						inputRef = el;
						if (local.indeterminate) {
							el.indeterminate = true;
						}
					}, local.ref)}
				/>
			</label>
			{(local.helperText || local.error) && (
				<span class="label label-text-alt text-wrap">
					{local.error || local.helperText}
				</span>
			)}
		</div>
	);
};
