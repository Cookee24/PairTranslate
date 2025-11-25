import { Check, CircleX } from "lucide-solid";
import {
	createSignal,
	type JSX,
	onCleanup,
	onMount,
	splitProps,
} from "solid-js";
import { Loading } from "~/components/Loading";
import { Menu } from "~/components/Menu";
import { useSettings } from "~/hooks/settings";
import { cn } from "~/utils/cn";
import { t } from "~/utils/i18n";

interface ItemProps {
	children?: JSX.Element;
	navId: string;
}

interface RootProps extends JSX.HTMLAttributes<HTMLDivElement> {
	drawerId: string;
}

const Root = (props: RootProps) => {
	const [local, rest] = splitProps(props, ["children", "class", "drawerId"]);
	return (
		<div class="drawer-side" {...rest}>
			<label
				for={local.drawerId}
				aria-label="close sidebar"
				class="drawer-overlay"
			/>
			<aside
				class={cn(
					"min-h-full w-72 lg:w-80 bg-base-100 text-base-content border-r border-base-300",
					local.class,
				)}
			>
				<div class="flex h-full flex-col">
					<div class="border-b border-base-200 px-6 pb-4 pt-6">
						<p class="text-xs font-semibold uppercase tracking-wide text-base-content/60">
							{t("settings.title")}
						</p>
						<p class="text-2xl font-bold text-base-content">{t("meta.name")}</p>
						<p class="mt-1 text-xs text-base-content/60">
							{t("meta.description")}
						</p>
					</div>
					<div class="px-4 pt-4">
						<Status />
					</div>
					<Menu.Root class="w-full menu-lg flex-1 gap-1 px-2 py-4">
						{local.children}
					</Menu.Root>
				</div>
			</aside>
		</div>
	);
};

const callbackMap = new WeakMap<
	HTMLElement,
	(isIntersecting: boolean) => void
>();

const observer = new IntersectionObserver(
	(entries) => {
		entries.forEach((entry) => {
			const callback = callbackMap.get(entry.target as HTMLElement);
			callback?.(entry.isIntersecting);
		});
	},
	{
		root: null,
		rootMargin: "0px",
		threshold: 0.6,
	},
);

const Item = (props: ItemProps) => {
	const [active, setActive] = createSignal(false);
	const handleClick = () => {
		const element = document.querySelector(`[data-nav='${props.navId}']`);
		element?.scrollIntoView({ behavior: "smooth" });
	};

	onMount(() => {
		const element = document.querySelector(
			`[data-nav='${props.navId}']`,
		) as HTMLElement | null;

		if (element) {
			callbackMap.set(element, (isIntersecting: boolean) => {
				setActive(isIntersecting);
			});
			observer.observe(element);
			onCleanup(() => {
				observer.unobserve(element);
				callbackMap.delete(element);
			});
		}
	});

	return (
		<Menu.Item>
			<button
				type="button"
				onClick={handleClick}
				class={cn(
					"flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-base-200",
					active() ? "bg-primary/10 text-primary" : "text-base-content/70",
				)}
			>
				{props.children}
			</button>
		</Menu.Item>
	);
};

interface StatusProps extends JSX.HTMLAttributes<HTMLDivElement> {}

const Status = (props: StatusProps) => {
	const [local, divProps] = splitProps(props, ["class"]);
	const { loading, error } = useSettings();
	return (
		<div
			{...divProps}
			class={cn(
				"flex items-center gap-2 rounded-box px-3 py-2 text-xs font-semibold",
				!loading() && !error() && "bg-success text-success-content",
				loading() && "bg-info text-info-content",
				error() && "bg-error text-error-content",
				local.class,
			)}
		>
			{loading() && <Loading size="xs" />}
			{error() && <CircleX size={16} />}
			{!loading() && !error() && <Check size={16} />}
			<span>
				{loading() && t("common.loading")}
				{error() && error()}
				{!loading() && !error() && t("common.allChangesSaved")}
			</span>
		</div>
	);
};

export default { Root, Item, Status };
