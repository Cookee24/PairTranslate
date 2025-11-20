import { Check, CircleX } from "lucide-solid";
import type { JSX } from "solid-js";

interface ItemProps {
	children?: JSX.Element;
	navId: string;
}

interface RootProps extends JSX.HTMLAttributes<HTMLDivElement> {}

const Root = (props: RootProps) => {
	const [local, rest] = splitProps(props, ["children", "class"]);
	return (
		<div
			class={cn(
				"flex flex-col items-center fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-lg shadow-lg shadow-base-200",
				local.class,
			)}
			{...rest}
		>
			<Status />
			<Menu.Root
				class="max-w-96 md:max-w-lg gap-2 bg-secondary/60 backdrop-blur-md text-secondary-content border-base-300 rounded-b-lg flex-nowrap overflow-x-auto"
				orientation="horizontal"
			>
				{local.children}
			</Menu.Root>
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
	let ref: HTMLButtonElement | undefined;
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

	createEffect(() => {
		if (active() && ref) {
			ref.scrollIntoView({ behavior: "smooth", inline: "center" });
		}
	});

	return (
		<Menu.Item>
			<Button
				variant={active() ? "primary" : "ghost"}
				onClick={handleClick}
				ref={ref}
			>
				{props.children}
			</Button>
		</Menu.Item>
	);
};

const Status = () => {
	const { loading, error } = useSettings();
	return (
		<div
			class="w-full p-2 flex items-center content-center gap-2 font-mono text-xs backdrop-blur-md rounded-t-lg"
			classList={{
				"bg-success/60": !loading() && !error(),
				"bg-accent/60": loading(),
				"bg-error/60": error() !== null,
			}}
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

export default { Root, Item };
