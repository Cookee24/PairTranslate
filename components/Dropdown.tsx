import {
	type Component,
	createEffect,
	createSignal,
	For,
	type JSX,
	onCleanup,
	Show,
	splitProps,
} from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/utils/cn";

const dropdownContainerVariants = tv({
	base: "dropdown",
	variants: {
		position: {
			bottom: "dropdown-bottom",
			top: "dropdown-top",
			left: "dropdown-left",
			right: "dropdown-right",
		},
		align: {
			start: "dropdown-start",
			end: "dropdown-end",
			center: "dropdown-center",
		},
		triggerType: {
			hover: "dropdown-hover",
			click: "",
		},
		open: {
			true: "dropdown-open",
		},
	},
});

const dropdownContentVariants = tv({
	base: "dropdown-content menu p-2 shadow-sm bg-base-100 rounded-box z-1",
});

export interface DropdownItem {
	id: string | number;
	label: string | JSX.Element;
	icon?: JSX.Element;
	disabled?: boolean;
	danger?: boolean;
	divider?: boolean;
	onClick?: () => void;
}

export interface DropdownProps
	extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "align">,
		VariantProps<typeof dropdownContainerVariants> {
	trigger: JSX.Element;
	items: DropdownItem[];
	disabled?: boolean;
	closeOnSelect?: boolean;
	width?: string;
	offset?: number;
	triggerClass?: string;
}

export const Dropdown: Component<DropdownProps> = (props) => {
	const [local, rest] = splitProps(props, [
		"trigger",
		"items",
		"position",
		"align",
		"triggerType",
		"disabled",
		"closeOnSelect",
		"width",
		"offset",
		"triggerClass",
		"class",
	]);

	const [isOpen, setIsOpen] = createSignal(false);
	let dropdownRef: HTMLDivElement | undefined;

	const handleClickOutside = (event: MouseEvent) => {
		if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
			setIsOpen(false);
		}
	};

	createEffect(() => {
		if (isOpen()) {
			document.addEventListener("click", handleClickOutside);
		} else {
			document.removeEventListener("click", handleClickOutside);
		}
		onCleanup(() => {
			document.removeEventListener("click", handleClickOutside);
		});
	});

	const handleTriggerClick = () => {
		if (local.disabled) return;
		if (local.triggerType === "click") {
			setIsOpen(!isOpen());
		}
	};

	const handleItemClick = (item: DropdownItem) => {
		if (item.disabled) return;
		item.onClick?.();
		if (local.closeOnSelect) {
			setIsOpen(false);
		}
	};

	return (
		<div
			{...rest}
			ref={dropdownRef}
			class={cn(
				dropdownContainerVariants({
					position: local.position,
					align: local.align,
					triggerType: local.triggerType,
					open: isOpen(),
				}),
			)}
		>
			<button
				type="button"
				tabindex={local.disabled ? -1 : 0}
				class={cn("btn m-1", local.triggerClass)}
				disabled={local.disabled}
				onClick={handleTriggerClick}
				onKeyPress={(e) => e.key === "Enter" && handleTriggerClick()}
			>
				{local.trigger}
			</button>
			<ul
				tabindex="0"
				class={cn(
					dropdownContentVariants(),
					local.width ? local.width : "w-52",
					local.class,
				)}
				style={local.offset ? { "margin-top": `${local.offset}px` } : {}}
			>
				<For each={local.items}>
					{(item) => (
						<li
							class={cn({
								disabled: item.disabled,
								"text-error": item.danger,
							})}
						>
							<button
								type="button"
								class="flex w-full items-center p-2 text-left"
								disabled={item.disabled}
								onClick={() => handleItemClick(item)}
							>
								<Show when={item.icon} keyed>
									{(i) => <span class="mr-2">{i}</span>}
								</Show>
								{item.label}
							</button>
						</li>
					)}
				</For>
			</ul>
		</div>
	);
};
