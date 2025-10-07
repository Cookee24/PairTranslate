import {
	type Component,
	createEffect,
	createSignal,
	createUniqueId,
	type JSX,
	splitProps,
} from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/utils/cn";

const drawerVariants = tv({
	base: "drawer",
	variants: {
		side: {
			left: "",
			right: "drawer-end",
		},
	},
	defaultVariants: {
		side: "left",
	},
});

const sidebarVariants = tv({
	base: "menu bg-base-200 text-base-content min-h-full p-4",
	variants: {
		width: {
			sm: "w-64",
			md: "w-80",
			lg: "w-96",
			xl: "w-[28rem]",
			"2xl": "w-[32rem]",
		},
	},
	defaultVariants: {
		width: "md",
	},
});

export interface DrawerProps
	extends JSX.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof drawerVariants> {
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	sidebarContent?: JSX.Element;
	sidebarWidth?: VariantProps<typeof sidebarVariants>["width"];
	sidebarClass?: string;
	overlayClass?: string;
	contentClass?: string;
	toggleId?: string;
}

export const Drawer: Component<DrawerProps> = (props) => {
	const [local, divProps] = splitProps(props, [
		"open",
		"defaultOpen",
		"onOpenChange",
		"sidebarContent",
		"sidebarWidth",
		"sidebarClass",
		"overlayClass",
		"contentClass",
		"toggleId",
		"side",
		"class",
		"children",
	]);

	const [internalOpen, setInternalOpen] = createSignal(
		local.open ?? local.defaultOpen ?? false,
	);

	const uniqueId = createUniqueId();
	const drawerId = () => local.toggleId || `drawer-${uniqueId}`;

	const isControlled = () => local.open !== undefined;
	const isOpen = () => (isControlled() ? local.open : internalOpen());

	createEffect(() => {
		if (isControlled() && local.open !== undefined) {
			setInternalOpen(local.open);
		}
	});

	const handleToggle = () => {
		const newOpen = !isOpen();
		if (!isControlled()) {
			setInternalOpen(newOpen);
		}
		local.onOpenChange?.(newOpen);
	};

	return (
		<div
			{...divProps}
			class={cn(drawerVariants({ side: local.side }), local.class)}
		>
			<input
				id={drawerId()}
				type="checkbox"
				class="drawer-toggle"
				checked={isOpen()}
				onChange={handleToggle}
			/>

			<div class={cn("drawer-content", local.contentClass)}>
				{local.children}
			</div>

			<div class="drawer-side">
				<label
					for={drawerId()}
					aria-label="close sidebar"
					class={cn("drawer-overlay", local.overlayClass)}
				/>
				<div
					class={cn(
						sidebarVariants({ width: local.sidebarWidth }),
						local.sidebarClass,
					)}
				>
					{local.sidebarContent}
				</div>
			</div>
		</div>
	);
};

export interface DrawerTriggerProps
	extends JSX.LabelHTMLAttributes<HTMLDivElement> {
	for: string;
}

export const DrawerTrigger: Component<DrawerTriggerProps> = (props) => {
	const [local, divProps] = splitProps(props, ["class", "children"]);

	return (
		<div {...divProps} class={cn("drawer-button", local.class)}>
			{local.children}
		</div>
	);
};
