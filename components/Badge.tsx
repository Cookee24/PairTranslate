import { mergeRefs } from "@solid-primitives/refs";
import {
	type Component,
	createEffect,
	type JSX,
	onCleanup,
	splitProps,
} from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/utils/cn";

const badgeVariants = tv({
	base: "badge",
	variants: {
		variant: {
			neutral: "badge-neutral",
			primary: "badge-primary",
			secondary: "badge-secondary",
			accent: "badge-accent",
			ghost: "badge-ghost",
			info: "badge-info",
			success: "badge-success",
			warning: "badge-warning",
			error: "badge-error",
		},
		size: {
			lg: "badge-lg",
			md: "badge-md",
			sm: "badge-sm",
			xs: "badge-xs",
		},
		outline: {
			true: "badge-outline",
		},
	},
	defaultVariants: {
		variant: "neutral",
		size: "md",
	},
});

export interface BadgeProps
	extends JSX.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {
	pulse?: boolean;
	dot?: boolean;
}

export const Badge: Component<BadgeProps> = (props) => {
	const [local, divProps] = splitProps(props, [
		"ref",
		"size",
		"variant",
		"outline",
		"pulse",
		"dot",
		"class",
		"children",
	]);

	let elementRef: HTMLDivElement | undefined;

	onMount(() => {
		createEffect(() => {
			if (local.pulse && elementRef) {
				const anim = animatePulse(elementRef);
				onCleanup(() => anim.cancel());
			}
		});

		animatedHover(
			() => elementRef,
			() => !local.pulse,
		);
	});

	if (local.dot) {
		return (
			<div class="indicator">
				<span
					class={cn(
						"indicator-item",
						badgeVariants({
							variant: local.variant,
							size: local.size,
							outline: local.outline,
						}),
					)}
				/>
				<div
					{...divProps}
					ref={mergeRefs((el) => {
						elementRef = el;
					}, local.ref)}
				>
					{local.children}
				</div>
			</div>
		);
	}

	return (
		<div
			{...divProps}
			class={cn(
				badgeVariants({
					variant: local.variant,
					size: local.size,
					outline: local.outline,
				}),
				local.class,
			)}
			ref={mergeRefs((el) => {
				elementRef = el;
			}, local.ref)}
		>
			{local.children}
		</div>
	);
};
