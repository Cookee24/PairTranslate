import katex from "katex";
import {
	createEffect,
	createSignal,
	type JSX,
	onCleanup,
	onMount,
	splitProps,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { animateEnter } from "~/hooks/animation";
import { cn } from "~/utils/cn";

const styles: Record<string, string> = {
	// Headings: Hierarchical size/weight/italic for sections
	h1: "text-2xl font-bold mb-6 mt-0 text-base-content font-serif",
	h2: "text-xl font-bold mb-4 mt-8 text-base-content/95 font-serif",
	h3: "text-lg font-bold mb-3 mt-6 text-base-content/90 font-serif",
	h4: "text-[0.9375rem] font-bold mb-2 mt-4 text-base-content/85 font-serif",
	h5: "text-[0.9375rem] font-bold italic mb-2 mt-4 text-base-content/80 font-serif",
	h6: "text-sm font-bold italic mb-1 mt-3 text-base-content/75 font-serif",

	// Links: Subtle (no bright blue) + underline on hover
	a: "text-primary hover:underline",

	// Blockquote: Academic citation style (left border + italic)
	blockquote:
		"border-l-4 border-base-300 pl-4 italic text-base-content/80 my-4 font-serif",

	br: "", // No styles needed for line breaks

	// Code: Monospace + light background (standard for snippets)
	code: "text-xs bg-base-100 px-1 py-0.5 rounded font-mono",
	pre: "bg-base-100 p-3 overflow-x-auto text-xs font-mono",

	// Inline text styles
	del: "line-through text-base-content/60",
	em: "italic",
	strong: "font-bold",

	// Divider: Subtle gray + spacing
	hr: "border-base-300 my-6",

	// Images: Responsive + centered (academic layout)
	img: "max-w-full h-auto mx-auto my-6 rounded-sm",

	// Lists: Indented + consistent spacing
	li: "mb-2 text-[0.9375rem] leading-relaxed text-base-content/80",
	ol: "list-decimal pl-6 font-serif",
	ul: "list-disc pl-6 font-serif",

	// Paragraph: Slightly smaller + readable line height
	p: "mb-4 text-[0.9375rem] leading-relaxed font-serif text-base-content/80",

	// Tables: Clean borders + zebra striping (readability)
	table: "w-full border-collapse my-4 font-serif",
	td: "border border-base-300 px-3 py-2 text-[0.9375rem] leading-relaxed text-base-content/80",
	tr: "even:bg-base-100",

	span: "",
};

const createComponent = (
	tag: keyof JSX.IntrinsicElements,
	anim?: boolean,
	styled?: boolean,
) => {
	return (props: JSX.IntrinsicElements[typeof tag]) => {
		const [local, rest] = splitProps(props, ["class", "ref"]);
		const defaultClass = styled ? styles[tag] : "";
		anim && onMount(() => local.ref && animateEnter(local.ref as HTMLElement));
		return (
			// @ts-ignore - Dynamic does accept intrinsic elements
			<Dynamic
				component={tag}
				class={cn(defaultClass, local.class) || undefined}
				ref={local.ref}
				{...rest}
			/>
		);
	};
};

const math = () => (props: { content?: string; center?: boolean }) => {
	const [ref, setRef] = createSignal<HTMLElement>();
	createEffect(() => {
		const ref_ = ref();
		if (!ref_) return;

		if (props.content) {
			katex.render(props.content, ref_, {
				throwOnError: false,
				strict: false,
				displayMode: !!props.center,
			});
			onCleanup(() => {
				ref_.textContent = "";
			});
		}
	});

	return <span ref={setRef} style={{ display: "contents" }}></span>;
};

export default (anim?: boolean, styled?: boolean) => {
	return {
		h1: createComponent("h1", anim, styled),
		h2: createComponent("h2", anim, styled),
		h3: createComponent("h3", anim, styled),
		h4: createComponent("h4", anim, styled),
		h5: createComponent("h5", anim, styled),
		h6: createComponent("h6", anim, styled),
		a: createComponent("a", anim, styled),
		blockquote: createComponent("blockquote", anim, styled),
		br: createComponent("br", anim, styled),
		code: createComponent("code", anim, styled),
		del: createComponent("del", anim, styled),
		em: createComponent("em", anim, styled),
		hr: createComponent("hr", anim, styled),
		img: createComponent("img", anim, styled),
		li: createComponent("li", anim, styled),
		ol: createComponent("ol", anim, styled),
		p: createComponent("p", anim, styled),
		pre: createComponent("pre", anim, styled),
		strong: createComponent("strong", anim, styled),
		table: createComponent("table", anim, styled),
		td: createComponent("td", anim, styled),
		tr: createComponent("tr", anim, styled),
		ul: createComponent("ul", anim, styled),
		span: createComponent("span", anim, styled),
		math: math(),
	};
};
