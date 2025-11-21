import { mergeRefs } from "@solid-primitives/refs";
import { Check, CircleX, Info, TriangleAlert, X } from "lucide-solid";
import { type Component, type JSX, Show, splitProps } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { animateClose } from "~/hooks/animation";
import { cn } from "~/utils/cn";

const alertVariants = tv({
	base: "alert",
	variants: {
		variant: {
			info: "alert-info",
			success: "alert-success",
			warning: "alert-warning",
			error: "alert-error",
			neutral: "alert-neutral",
		},
		size: {
			sm: "text-sm p-3",
			md: "p-4",
			lg: "text-lg p-5",
		},
	},
	defaultVariants: {
		variant: "info",
		size: "md",
	},
});

export interface AlertProps
	extends JSX.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof alertVariants> {
	title?: string;
	description?: string;
	closable?: boolean;
	icon?: JSX.Element;
	onClose?: () => void;
	actions?: JSX.Element;
}

export const Alert: Component<AlertProps> = (props) => {
	const [local, divProps] = splitProps(props, [
		"variant",
		"size",
		"title",
		"description",
		"closable",
		"icon",
		"onClose",
		"actions",
		"class",
		"children",
		"ref",
	]);

	let alertRef: HTMLDivElement | undefined;

	const handleClose = () => {
		if (alertRef) {
			const element = alertRef;
			animateClose(element).then(() => {
				local.onClose?.();
				element.remove();
			});
		}
	};

	const variantIcon = () => {
		if (local.icon) {
			return local.icon;
		}
		switch (local.variant) {
			case "info":
				return <Info class="h-6 w-6" />;
			case "success":
				return <Check class="h-6 w-6" />;
			case "warning":
				return <TriangleAlert class="h-6 w-6" />;
			case "error":
				return <CircleX class="h-6 w-6" />;
			default:
				return null;
		}
	};

	return (
		<div
			{...divProps}
			class={cn(
				alertVariants({ variant: local.variant, size: local.size }),
				local.class,
			)}
			role="alert"
			ref={mergeRefs((el) => {
				alertRef = el;
			}, local.ref)}
		>
			<Show when={variantIcon()}>
				<div class="shrink-0">{variantIcon()}</div>
			</Show>
			<div class="flex-1">
				<Show when={local.title}>
					<h3 class="font-bold">{local.title}</h3>
				</Show>
				<Show when={local.description}>
					<div class="text-xs">{local.description}</div>
				</Show>
				{local.children}
			</div>
			<Show when={local.actions}>
				<div class="flex-none">{local.actions}</div>
			</Show>
			<Show when={local.closable}>
				<button
					type="button"
					class="btn btn-sm btn-circle btn-ghost"
					onClick={handleClose}
				>
					<X class="h-4 w-4" />
				</button>
			</Show>
		</div>
	);
};
