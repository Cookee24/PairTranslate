import {
	type Component,
	createEffect,
	createSignal,
	For,
	Show,
	splitProps,
} from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/utils/cn";

const filterVariants = tv({
	base: "filter",
	variants: {
		size: {
			xs: "[&_.btn]:btn-xs",
			sm: "[&_.btn]:btn-sm",
			md: "[&_.btn]:btn-md",
			lg: "[&_.btn]:btn-lg",
			xl: "[&_.btn]:btn-xl",
		},
		variant: {
			default: "",
			outlined: "[&_.btn]:btn-outline",
			ghost: "[&_.btn]:btn-ghost",
		},
	},
	defaultVariants: {
		size: "md",
		variant: "default",
	},
});

const buttonVariants = tv({
	base: "btn",
	variants: {
		active: {
			true: "btn-active",
		},
		reset: {
			true: "btn-square filter-reset",
		},
	},
});

export interface FilterOption {
	value: string;
	label: string;
	disabled?: boolean;
}

export interface FilterProps extends VariantProps<typeof filterVariants> {
	name: string;
	options: FilterOption[];
	value?: string;
	defaultValue?: string;
	onChange?: (value: string) => void;
	onReset?: () => void;
	showReset?: boolean;
	resetLabel?: string;
	useForm?: boolean;
	class?: string;
}

export const Filter: Component<FilterProps> = (props) => {
	const [local] = splitProps(props, [
		"name",
		"options",
		"value",
		"defaultValue",
		"onChange",
		"onReset",
		"showReset",
		"resetLabel",
		"useForm",
		"size",
		"variant",
		"class",
	]);

	const [internalValue, setInternalValue] = createSignal(
		local.value || local.defaultValue || "",
	);

	const isControlled = () => local.value !== undefined;
	const currentValue = () =>
		isControlled() ? local.value || "" : internalValue();

	createEffect(() => {
		if (isControlled() && local.value !== undefined) {
			setInternalValue(local.value);
		}
	});

	const handleChange = (value: string) => {
		if (!isControlled()) {
			setInternalValue(value);
		}
		local.onChange?.(value);
	};

	const handleReset = () => {
		const resetValue = "";
		if (!isControlled()) {
			setInternalValue(resetValue);
		}
		local.onReset?.();
		local.onChange?.(resetValue);
	};

	return (
		<Show
			when={local.useForm}
			fallback={
				<div
					class={cn(
						filterVariants({
							size: local.size,
							variant: local.variant,
						}),
						local.class,
					)}
				>
					{local.showReset && (
						<input
							type="radio"
							class={cn(buttonVariants({ reset: true }), "appearance-none")}
							name={local.name}
							value=""
							checked={currentValue() === ""}
							onChange={() => handleReset()}
							onClick={handleReset}
							aria-label={local.resetLabel || "×"}
						/>
					)}
					<For each={local.options}>
						{(option) => (
							<input
								type="radio"
								class={cn(
									buttonVariants({
										active: currentValue() === option.value,
									}),
									"appearance-none",
								)}
								name={local.name}
								value={option.value}
								checked={currentValue() === option.value}
								disabled={option.disabled}
								onChange={() => handleChange(option.value)}
								aria-label={option.label}
							/>
						)}
					</For>
				</div>
			}
		>
			<form
				class={cn(
					filterVariants({
						size: local.size,
						variant: local.variant,
					}),
					local.class,
				)}
			>
				{local.showReset && (
					<input
						type="reset"
						class={buttonVariants({ reset: true })}
						value="×"
						onClick={handleReset}
						aria-label={local.resetLabel || t("common.resetFilter")}
					/>
				)}
				<For each={local.options}>
					{(option) => (
						<input
							type="radio"
							class={cn(
								buttonVariants({
									active: currentValue() === option.value,
								}),
								"appearance-none",
							)}
							name={local.name}
							value={option.value}
							checked={currentValue() === option.value}
							disabled={option.disabled}
							onChange={() => handleChange(option.value)}
							aria-label={option.label}
						/>
					)}
				</For>
			</form>
		</Show>
	);
};
