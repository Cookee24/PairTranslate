import { mergeRefs } from "@solid-primitives/refs";
import { Book, BookType, Newspaper } from "lucide-solid";
import type { Component, JSX } from "solid-js";
import { onMount, splitProps } from "solid-js";
import { TAGS } from "~/utils/constants";

interface ThinkProps extends JSX.HTMLAttributes<HTMLDivElement> {}
const Think: Component<ThinkProps> = (props) => {
	const [local, rest] = splitProps(props, ["children", "ref"]);
	let elementRef: HTMLDivElement | undefined;

	onMount(() => elementRef && animateEnter(elementRef));
	onCleanup(() => elementRef && animateExit(elementRef));

	return (
		<div
			class="bg-base-300 rounded p-2 my-2 text-mono text-base-content/60 max-h-64 overflow-y-auto"
			ref={mergeRefs((el) => {
				elementRef = el;
			}, local.ref)}
			{...rest}
		>
			{local.children}
		</div>
	);
};

interface ExampleProps extends JSX.HTMLAttributes<HTMLDivElement> {}
const Example = (props: ExampleProps) => {
	// Special handling for 'id' prop to avoid passing it down
	const [local, rest] = splitProps(props, ["id", "children", "ref"]);
	let elementRef: HTMLDivElement | undefined;

	onMount(() => elementRef && animateEnter(elementRef));
	onCleanup(() => elementRef && animateExit(elementRef));

	return (
		<div
			class="bg-base-300 rounded p-2 my-2"
			ref={mergeRefs((el) => {
				elementRef = el;
			}, local.ref)}
			{...rest}
		>
			<span class="flex gap-2 items-center mb-2 font-sm text-base-content/60">
				<Book size={16} />
				{t("actions.example")}
				{local.id && (
					<span class="items-center text-center bg-neutral text-neutral-content text-xs rounded p-1">
						{local.id}
					</span>
				)}
			</span>
			{local.children}
		</div>
	);
};

interface ContextMeanProps extends JSX.HTMLAttributes<HTMLDivElement> {}
const ContextMean = (props: ContextMeanProps) => {
	const [local, rest] = splitProps(props, ["children", "ref"]);
	let elementRef: HTMLDivElement | undefined;

	onMount(() => elementRef && animateEnter(elementRef));
	onCleanup(() => elementRef && animateExit(elementRef));

	return (
		<div
			class="bg-base-300 rounded p-2 my-2"
			ref={mergeRefs((el) => {
				elementRef = el;
			}, local.ref)}
			{...rest}
		>
			<span class="flex gap-2 items-center mb-2 font-sm text-base-content/60">
				<Newspaper size={16} />
				{t("actions.contextMean")}
			</span>
			{local.children}
		</div>
	);
};

interface MeanProps extends JSX.HTMLAttributes<HTMLDivElement> {}
const Mean = (props: MeanProps) => {
	const [local, rest] = splitProps(props, ["children", "ref"]);
	let elementRef: HTMLDivElement | undefined;

	onMount(() => elementRef && animateEnter(elementRef));
	onCleanup(() => elementRef && animateExit(elementRef));

	return (
		<div
			class="bg-base-300 rounded p-2 my-2"
			ref={mergeRefs((el) => {
				elementRef = el;
			}, local.ref)}
			{...rest}
		>
			<span class="flex gap-2 items-center mb-2 font-sm text-base-content/60">
				<BookType size={16} />
				{t("actions.mean")}
			</span>
			{local.children}
		</div>
	);
};

type CustomComponents = {
	[TAGS.think]: Component<ThinkProps>;
	[TAGS.example]: Component<ExampleProps>;
	[TAGS.contextMean]: Component<ContextMeanProps>;
	[TAGS.mean]: Component<MeanProps>;
};

export default (): CustomComponents => {
	const result: CustomComponents = {
		[TAGS.think]: Think,
		[TAGS.example]: Example,
		[TAGS.contextMean]: ContextMean,
		[TAGS.mean]: Mean,
	};
	return result;
};

// biome-ignore lint/suspicious/noExplicitAny: Any component props
export const Fallback = (props?: any) => {
	return <div {...props} />;
};
