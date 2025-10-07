import { type Component, type JSX, splitProps } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/utils/cn";

const menuVariants = tv({
	base: "menu",
	variants: {
		orientation: {
			vertical: "menu-vertical",
			horizontal: "menu-horizontal",
		},
		size: {
			xs: "menu-xs",
			sm: "menu-sm",
			md: "menu-md",
			lg: "menu-lg",
			xl: "menu-xl",
		},
	},
	defaultVariants: {
		orientation: "vertical",
		size: "md",
	},
});

export interface MenuProps
	extends JSX.HTMLAttributes<HTMLUListElement>,
		VariantProps<typeof menuVariants> {
	rounded?: boolean;
}

const MenuRoot: Component<MenuProps> = (props) => {
	const [local, ulProps] = splitProps(props, [
		"orientation",
		"size",
		"rounded",
		"class",
		"children",
		"ref",
	]);

	return (
		<ul
			{...ulProps}
			class={cn(
				menuVariants({
					orientation: local.orientation,
					size: local.size,
				}),
				local.rounded && "rounded-box",
				local.class,
			)}
			ref={local.ref}
		>
			{props.children}
		</ul>
	);
};

export interface MenuItemProps extends JSX.HTMLAttributes<HTMLLIElement> {
	disabled?: boolean;
	active?: boolean;
	focused?: boolean;
}

const MenuItem: Component<MenuItemProps> = (props) => {
	const [local, liProps] = splitProps(props, [
		"disabled",
		"active",
		"focused",
		"class",
		"children",
		"ref",
	]);

	return (
		<li
			{...liProps}
			class={cn(local.disabled && "menu-disabled", local.class)}
			ref={local.ref}
		>
			{props.children}
		</li>
	);
};

export interface MenuSubItemProps
	extends JSX.HTMLAttributes<HTMLAnchorElement> {
	active?: boolean;
	focused?: boolean;
	href?: string;
	as?: "a";
}

export interface MenuSubButtonProps
	extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
	active?: boolean;
	focused?: boolean;
	as?: "button";
}

const MenuSubItem: Component<MenuSubItemProps> = (props) => {
	const [local, elementProps] = splitProps(props, [
		"active",
		"focused",
		"href",
		"as",
		"class",
		"children",
		"ref",
	]);

	return (
		<a
			{...elementProps}
			href={local.href}
			class={cn(
				local.active && "menu-active",
				local.focused && "menu-focus",
				local.class,
			)}
			ref={local.ref}
		>
			{props.children}
		</a>
	);
};

const MenuSubButton: Component<MenuSubButtonProps> = (props) => {
	const [local, buttonProps] = splitProps(props, [
		"active",
		"focused",
		"as",
		"class",
		"children",
		"ref",
	]);

	return (
		<button
			{...buttonProps}
			class={cn(
				local.active && "menu-active",
				local.focused && "menu-focus",
				local.class,
			)}
			ref={local.ref}
		>
			{props.children}
		</button>
	);
};

export interface MenuTitleProps extends JSX.HTMLAttributes<HTMLLIElement> {
	disabled?: boolean;
}

const MenuTitle: Component<MenuTitleProps> = (props) => {
	const [local, liProps] = splitProps(props, [
		"disabled",
		"class",
		"children",
		"ref",
	]);

	return (
		<li
			{...liProps}
			class={cn("menu-title", local.disabled && "disabled", local.class)}
			ref={local.ref}
		>
			{props.children}
		</li>
	);
};

export interface MenuDropdownProps
	extends JSX.HTMLAttributes<HTMLUListElement> {
	show?: boolean;
}

const MenuDropdown: Component<MenuDropdownProps> = (props) => {
	const [local, ulProps] = splitProps(props, [
		"show",
		"class",
		"children",
		"ref",
	]);

	return (
		<ul
			{...ulProps}
			class={cn(
				"menu-dropdown",
				local.show && "menu-dropdown-show",
				local.class,
			)}
			ref={local.ref}
		>
			{props.children}
		</ul>
	);
};

export interface MenuDropdownToggleProps
	extends JSX.HTMLAttributes<HTMLButtonElement> {
	show?: boolean;
}

const MenuDropdownToggle: Component<MenuDropdownToggleProps> = (props) => {
	const [local, buttonProps] = splitProps(props, [
		"show",
		"class",
		"children",
		"ref",
	]);

	return (
		<button
			{...buttonProps}
			class={cn(
				"menu-dropdown-toggle",
				local.show && "menu-dropdown-show",
				local.class,
			)}
			ref={local.ref}
		>
			{props.children}
		</button>
	);
};

export const Menu = {
	Root: MenuRoot,
	Item: MenuItem,
	SubItem: MenuSubItem,
	SubButton: MenuSubButton,
	Title: MenuTitle,
	Dropdown: MenuDropdown,
	DropdownToggle: MenuDropdownToggle,
};
