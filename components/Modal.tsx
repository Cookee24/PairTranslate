import { mergeRefs } from "@solid-primitives/refs";
import { type Component, createEffect, type JSX, splitProps } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/utils/cn";

const modalVariants = tv({
	base: "modal",
	variants: {
		open: {
			true: "modal-open",
		},
	},
});

const modalBoxVariants = tv({
	base: "modal-box max-h-[90vh]",
});

export interface ModalProps
	extends Omit<JSX.HTMLAttributes<HTMLDialogElement>, "open">,
		VariantProps<typeof modalVariants> {
	onClose?: () => void;
	boxClass?: string;
	backdrop?: boolean;
	title?: string;
	actions?: JSX.Element;
	closable?: boolean;
}

export const Modal: Component<ModalProps> = (props) => {
	const [local, dialogProps] = splitProps(props, [
		"tabindex",
		"open",
		"onClose",
		"boxClass",
		"backdrop",
		"title",
		"actions",
		"closable",
		"children",
		"class",
		"ref",
	]);

	let dialogRef: HTMLDialogElement | undefined;
	const [ref, setRef] = createSignal<HTMLDivElement>();
	createAnimatedAppearance(ref, () => local.open === true);
	createEffect(() => {
		if (local.open) {
			dialogRef?.showModal();
		} else {
			dialogRef?.close();
		}
	});

	return (
		<dialog
			ref={mergeRefs((el) => {
				dialogRef = el;
			}, local.ref)}
			class={cn(modalVariants({ open: local.open }), local.class)}
			onClose={local.onClose}
			{...dialogProps}
		>
			<div class={cn(modalBoxVariants(), local.boxClass)} ref={setRef}>
				{local.closable !== false && (
					<form method="dialog">
						<button
							type="submit"
							class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
						>
							✕
						</button>
					</form>
				)}
				{local.title && <h3 class="font-bold text-lg mb-4">{local.title}</h3>}

				<div class="py-4">{local.children}</div>

				{local.actions && (
					<div class="modal-action">
						<form method="dialog">{local.actions}</form>
					</div>
				)}
			</div>
			{local.backdrop !== false && (
				<form method="dialog" class="modal-backdrop">
					<button type="submit">close</button>
				</form>
			)}
		</dialog>
	);
};
