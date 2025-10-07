import { type Component, For, type JSX, Show, splitProps } from "solid-js";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/utils/cn";

const paginationVariants = tv({
	base: "join",
	variants: {
		size: {
			xs: "[&_.btn]:btn-xs",
			sm: "[&_.btn]:btn-sm",
			md: "[&_.btn]:btn-md",
			lg: "[&_.btn]:btn-lg",
			xl: "[&_.btn]:btn-xl",
		},
	},
	defaultVariants: {
		size: "md",
	},
});

const pageItemVariants = tv({
	base: "join-item btn",
	variants: {
		active: {
			true: "btn-active",
		},
		disabled: {
			true: "btn-disabled",
		},
	},
});

export interface PaginationItem {
	page: number | string;
	label?: string;
	disabled?: boolean;
	isEllipsis?: boolean;
}

export interface PaginationProps
	extends JSX.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof paginationVariants> {
	currentPage?: number;
	totalPages?: number;
	onPageChange?: (page: number) => void;
	showNavigation?: boolean;
	showFirstLast?: boolean;
	prevLabel?: string;
	nextLabel?: string;
	firstLabel?: string;
	lastLabel?: string;
	items?: PaginationItem[];
	maxVisiblePages?: number;
}

export const Pagination: Component<PaginationProps> = (props) => {
	const [local, divProps] = splitProps(props, [
		"currentPage",
		"totalPages",
		"onPageChange",
		"showNavigation",
		"showFirstLast",
		"prevLabel",
		"nextLabel",
		"firstLabel",
		"lastLabel",
		"items",
		"maxVisiblePages",
		"size",
		"class",
	]);

	const currentPage = () => local.currentPage ?? 1;
	const totalPages = () => local.totalPages ?? 1;
	const maxVisible = () => local.maxVisiblePages ?? 7;

	const handlePageChange = (page: number | string) => {
		if (typeof page === "number" && page !== currentPage()) {
			local.onPageChange?.(page);
		}
	};

	const generatePageItems = (): PaginationItem[] => {
		if (local.items) return local.items;

		const total = totalPages();
		const current = currentPage();
		const max = maxVisible();

		if (total <= max) {
			return Array.from({ length: total }, (_, i) => ({
				page: i + 1,
				label: (i + 1).toString(),
			}));
		}

		const items: PaginationItem[] = [];
		const halfMax = Math.floor(max / 2);

		let start = Math.max(1, current - halfMax);
		const end = Math.min(total, start + max - 1);

		if (end - start + 1 < max) {
			start = Math.max(1, end - max + 1);
		}

		if (start > 2) {
			items.push({ page: 1, label: "1" });
			if (start > 3) {
				items.push({
					page: "...",
					label: "...",
					disabled: true,
					isEllipsis: true,
				});
			}
		}

		for (let i = start; i <= end; i++) {
			items.push({ page: i, label: i.toString() });
		}

		if (end < total - 1) {
			if (end < total - 2) {
				items.push({
					page: "...",
					label: "...",
					disabled: true,
					isEllipsis: true,
				});
			}
			items.push({ page: total, label: total.toString() });
		}

		return items;
	};

	const pageItems = () => generatePageItems();
	const canGoPrev = () => currentPage() > 1;
	const canGoNext = () => currentPage() < totalPages();

	return (
		<div
			{...divProps}
			class={cn(paginationVariants({ size: local.size }), local.class)}
		>
			<Show when={local.showFirstLast && canGoPrev()}>
				<button
					type="button"
					class={pageItemVariants({})}
					onClick={() => handlePageChange(1)}
					disabled={!canGoPrev()}
				>
					{local.firstLabel ?? "««"}
				</button>
			</Show>

			<Show when={local.showNavigation}>
				<button
					type="button"
					class={pageItemVariants({ disabled: !canGoPrev() })}
					onClick={() => handlePageChange(currentPage() - 1)}
					disabled={!canGoPrev()}
				>
					{local.prevLabel ?? "‹"}
				</button>
			</Show>

			<For each={pageItems()}>
				{(item) => (
					<button
						type="button"
						class={pageItemVariants({
							active: !item.isEllipsis && item.page === currentPage(),
							disabled: item.disabled || item.isEllipsis,
						})}
						onClick={() => !item.isEllipsis && handlePageChange(item.page)}
						disabled={item.disabled || item.isEllipsis}
					>
						{item.label ?? item.page}
					</button>
				)}
			</For>

			<Show when={local.showNavigation}>
				<button
					type="button"
					class={pageItemVariants({ disabled: !canGoNext() })}
					onClick={() => handlePageChange(currentPage() + 1)}
					disabled={!canGoNext()}
				>
					{local.nextLabel ?? "›"}
				</button>
			</Show>

			<Show when={local.showFirstLast && canGoNext()}>
				<button
					type="button"
					class={pageItemVariants({})}
					onClick={() => handlePageChange(totalPages())}
					disabled={!canGoNext()}
				>
					{local.lastLabel ?? "»»"}
				</button>
			</Show>
		</div>
	);
};
