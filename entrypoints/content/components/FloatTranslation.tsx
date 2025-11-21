import {
	BookOpen,
	BookText,
	Brain,
	Cpu,
	Languages,
	Newspaper,
	RotateCcw,
	ScrollText,
} from "lucide-solid";
import type { JSX } from "solid-js";
import {
	createEffect,
	createMemo,
	createSignal,
	Index,
	onCleanup,
	Show,
	splitProps,
} from "solid-js";
import { Badge } from "@/components/Badge";
import Dict from "@/components/Dict";
import { MdStyled } from "@/components/MD";
import { createAnimatedAppearance } from "@/hooks/animation";
import { createDictionary } from "@/hooks/dictionary";
import { Button } from "~/components/Button";
import { Loading } from "~/components/Loading";
import { useSettings } from "~/hooks/settings";
import { createTranslation } from "~/hooks/translation";
import { cn } from "~/utils/cn";
import { PROMPT_ID } from "~/utils/constants";
import { t } from "~/utils/i18n";
import { autoParseJson, jsonAutocomplete } from "~/utils/json-autocomplete";
import { getPageContext } from "~/utils/page-context";
import type { ExplainOutput } from "~/utils/prompt";
import type { TextContext } from "~/utils/types";

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
	textContext: TextContext;
	mode: "translate" | "explain";
}

export default (props: Props) => {
	const [local, rest] = splitProps(props, ["class", "textContext", "mode"]);

	return (
		<div class={cn("w-full h-full", local.class)} {...rest}>
			<div class="align-middle font-mono text-sm h-24 bg-linear-to-b from-primary to-transparent text-primary-content whitespace-break-spaces overflow-y-auto">
				<span>{props.textContext.surr?.before}</span>
				<span
					class="font-bold bg-accent text-accent-content"
					ref={(ref) => {
						setTimeout(() => {
							ref.scrollIntoView({ behavior: "smooth", block: "center" });
						}, 300);
					}}
				>
					{props.textContext.text}
				</span>
				<span>{props.textContext.surr?.after}</span>
			</div>
			{local.mode === "translate" ? (
				<Translate textContext={local.textContext} />
			) : (
				<Explain textContext={local.textContext} />
			)}
		</div>
	);
};

// Shared ResizeObserver instance
let sharedResizeObserver: ResizeObserver | null = null;
const resizeCallbacks = new WeakMap<Element, () => void>();

const getSharedResizeObserver = () => {
	if (!sharedResizeObserver) {
		sharedResizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const callback = resizeCallbacks.get(entry.target);
				callback?.();
			}
		});
	}
	return sharedResizeObserver;
};

const ScrollableReasoning = (props: { text: string }) => {
	const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();
	const [showTop, setShowTop] = createSignal(false);
	const [showBottom, setShowBottom] = createSignal(false);

	const checkScroll = () => {
		const el = containerRef();
		if (!el) return;

		const { scrollTop, scrollHeight, clientHeight } = el;
		setShowTop(scrollTop > 0);
		setShowBottom(scrollTop + clientHeight < scrollHeight - 1);
	};

	createEffect(() => {
		const el = containerRef();
		if (!el) return;

		checkScroll();
		el.addEventListener("scroll", checkScroll);

		const observer = getSharedResizeObserver();
		resizeCallbacks.set(el, checkScroll);
		observer.observe(el);

		onCleanup(() => {
			el.removeEventListener("scroll", checkScroll);
			observer.unobserve(el);
			resizeCallbacks.delete(el);
		});
	});

	return (
		<div class="w-full flex flex-col">
			<span class="w-full text-end align-middle text-xs">
				{showTop() ? "↑" : "•"}
			</span>
			<div ref={setContainerRef} class="max-h-32 overflow-y-auto">
				<MdStyled text={props.text} />
			</div>
			<span class="w-full text-end align-middle text-xs">
				{showBottom() ? "↓" : "•"}
			</span>
		</div>
	);
};

const Explain = (props: { textContext: TextContext }) => {
	const { settings } = useSettings();
	const [data, retry] = createTranslation(() => props.textContext.text, {
		promptId: PROMPT_ID.explain,
		modelId: () => settings.translate.floatingExplainModel,
		ctx: () => ({
			surr: props.textContext.surr,
			page: getPageContext(),
		}),
		stream: true,
	});
	const [completeData, setCompleteData] =
		createSignal<Partial<ExplainOutput> | null>(null);

	createEffect(() => {
		const result = data();
		if (!result) return;

		setCompleteData(
			(prev) =>
				autoParseJson<Partial<ExplainOutput>>(jsonAutocomplete(result)) || prev,
		);
	});

	const dict = createDictionary(() => props.textContext.text);

	const currentModelName = createMemo(
		() =>
			settings.services[settings.translate.floatingExplainModel ?? ""]?.name ||
			"",
	);

	return (
		<div class="p-2 py-4 space-y-2">
			<Show when={dict()}>
				{(data) => (
					<ExplainSection
						title={t("floatingTranslator.sections.dictionary")}
						icon={<BookOpen size={16} />}
					>
						<Dict {...data()[0]} />
					</ExplainSection>
				)}
			</Show>
			<Show when={data.reasoning}>
				{(reasoning) => (
					<ExplainSection
						title={t("floatingTranslator.sections.reasoning")}
						icon={<Brain size={16} />}
					>
						<ScrollableReasoning text={reasoning() || ""} />
					</ExplainSection>
				)}
			</Show>
			<Show when={completeData()?.context_explanation}>
				{(data) => (
					<ExplainSection
						title={t("floatingTranslator.sections.contextExplanation")}
						icon={<Newspaper size={16} />}
					>
						<MdStyled text={data()} />
					</ExplainSection>
				)}
			</Show>
			<Show when={completeData()?.text_explanation}>
				{(data) => (
					<ExplainSection
						title={t("floatingTranslator.sections.textExplanation")}
						icon={<ScrollText size={16} />}
					>
						<MdStyled text={data()} />
					</ExplainSection>
				)}
			</Show>
			<Show when={completeData()?.examples}>
				{(data) => (
					<ExplainSection
						title={t("floatingTranslator.sections.examples")}
						icon={<BookText size={16} />}
					>
						<ul class="list space-y-2">
							<Index each={data()}>
								{(item, index) => (
									<li class="list-item bg-base-200 p-2 rounded-box">
										<Badge class="mb-1" size="xs">
											{index + 1}
										</Badge>
										<MdStyled text={item().text} />
										<MdStyled text={item().translation} />
									</li>
								)}
							</Index>
						</ul>
					</ExplainSection>
				)}
			</Show>
			<div class="w-full flex items-center justify-end mt-2 gap-2">
				{data.error && (
					<span class=" font-mono text-xs text-error">
						{data.error.message}
					</span>
				)}
				<Cpu size={12} />
				<span class="mr-4 text-xs text-base-content/60 max-w-32 truncate">
					{currentModelName()}
				</span>
				<Button
					size="sm"
					onClick={() => {
						setCompleteData(null);
						retry();
					}}
					disabled={data.loading || data.streaming}
				>
					{data.len !== null && data.streaming ? (
						<>
							<Loading size="xs" />
							{data.len}
						</>
					) : (
						<>
							<RotateCcw size={12} />
							<span>{t("common.retry")}</span>
						</>
					)}
				</Button>
			</div>
		</div>
	);
};

const Translate = (props: { textContext: TextContext }) => {
	const { settings } = useSettings();
	const [data, retry] = createTranslation(() => props.textContext.text, {
		promptId: PROMPT_ID.translate,
		modelId: () => settings.translate.floatingTranslateModel,
		ctx: () => ({
			surr: props.textContext.surr,
			page: getPageContext(),
		}),
		stream: true,
	});

	const currentModelName = createMemo(
		() =>
			settings.services[settings.translate.floatingTranslateModel ?? ""]
				?.name || "",
	);

	return (
		<div class="m-2 p-4 bg-base-200 rounded-md">
			<div class="flex items-center gap-2 mb-2 text-sm text-base-content/80">
				<Languages size={16} />
				{t("floatingTranslator.sections.translation")}
			</div>
			{data() && <div>{data()}</div>}
			<Show when={data.reasoning}>
				{(reasoning) => (
					<div class="mt-3 rounded-md border border-base-300 bg-base-100 p-3">
						<div class="mb-1 flex items-center gap-2 text-xs text-base-content/70">
							<Brain size={14} />
							{t("floatingTranslator.sections.reasoning")}
						</div>
						<ScrollableReasoning text={reasoning() || ""} />
					</div>
				)}
			</Show>
			<div class="w-full flex items-center justify-end mt-2 gap-2">
				<Cpu size={12} />
				<span class="mr-4 text-xs text-base-content/60 max-w-32 truncate">
					{currentModelName()}
				</span>
				<Button
					size="sm"
					onClick={retry}
					disabled={data.loading || data.streaming}
				>
					{data.len !== null && data.streaming ? (
						<>
							<Loading size="xs" />
							{data.len}
						</>
					) : (
						<>
							<RotateCcw size={12} />
							<span>{t("common.retry")}</span>
						</>
					)}
				</Button>
			</div>
		</div>
	);
};

const ExplainSection = (props: {
	title: string;
	icon: JSX.Element;
	children: JSX.Element;
}) => {
	const [ref, setRef] = createSignal<HTMLDivElement>();
	createAnimatedAppearance(ref);

	return (
		<div class="p-2 bg-base-100 text-base-content rounded-box" ref={setRef}>
			<div class="flex items-center gap-2 mb-2 text-sm text-base-content/80">
				{props.icon}
				{props.title}
			</div>
			<div>{props.children}</div>
		</div>
	);
};
