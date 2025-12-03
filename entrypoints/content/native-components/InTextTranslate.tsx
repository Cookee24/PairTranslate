import { CircleX, Languages } from "lucide-solid";
import {
	createEffect,
	createMemo,
	createSignal,
	For,
	Index,
	on,
} from "solid-js";
import { createIdleDebounce } from "@/hooks/throttle";
import { Md } from "~/components/MD/Md";
import { TranslateNodePortal } from "~/components/MPortal";
import { useSettings } from "~/hooks/settings";
import { createBatchTranslation, createTranslation } from "~/hooks/translation";
import { useWebsiteRule } from "~/hooks/website-rule";
import { PROMPT_ID } from "~/utils/constants";
import { copyToClipboard } from "~/utils/copy";
import { extractMarkdownContent } from "~/utils/markdown";
import type { DOMSection } from "~/utils/parser/types";
import { estimateTokens } from "~/utils/token-estimate";
import InTextTooltip from "../components/InTextTooltip";
import { extractTextContext } from "../context/element";
import { NativeLoading } from "./Loading";

const NEW_LINE_THRESHOLD = 10;

interface SingleProps {
	node: Node;
}
export const SingleInTextTranslation = (props: SingleProps) => {
	const { settings } = useSettings();
	const websiteRule = useWebsiteRule();

	const context = createMemo(() => extractTextContext(props.node));
	const [data, retry] = createTranslation<string>(() => context().text, {
		promptId: PROMPT_ID.translate,
		modelId: () =>
			websiteRule.inTextTranslateModel ||
			settings.translate.inTextTranslateModel,
		srcLang: () => websiteRule.sourceLang || settings.translate.sourceLang,
		dstLang: () => websiteRule.targetLang || settings.translate.targetLang,
	});

	const handleRetry = () => {
		retry();
	};

	const hideOriginal = () =>
		(websiteRule.translateMode ?? settings.translate.translationMode) ===
		"replace";

	return (
		<TranslationRender
			text={data()}
			loading={data.loading}
			error={data.error?.message}
			section={props.node}
			hideOriginal={hideOriginal()}
			onRetry={handleRetry}
		/>
	);
};

type SectionTextPair = [DOMSection, string];

interface BatchProps {
	sections: Set<DOMSection>;
	onDelete?: (section: DOMSection) => void;
}
export const BatchInTextTranslation = (props: BatchProps) => {
	const { settings } = useSettings();
	const websiteRule = useWebsiteRule();
	const [renderList, setRenderList] = createSignal([] as SectionTextPair[][], {
		equals: false,
	});

	const batchIds = new Map<DOMSection, number>();

	const clear = () => {
		setRenderList([]);
		batchIds.clear();
	};

	createEffect(
		on(
			[() => props.sections],
			([currentSections]) => {
				if (currentSections.size === 0) {
					clear();
					return;
				}

				createIdleDebounce(() => {
					const currentModelQueueSettings =
						settings.services[
							websiteRule.inTextTranslateModel ||
								settings.translate.inTextTranslateModel ||
								""
						]?.queue;
					const maxBatchSize =
						currentModelQueueSettings?.maxBatchSize ||
						settings.queue.maxBatchSize;

					setRenderList((prev) => {
						const maxTokensPerBatch =
							currentModelQueueSettings?.maxTokensPerBatch ||
							settings.queue.maxTokensPerBatch;

						let last = prev.length; // Force a new batch
						for (const section of currentSections) {
							const batchId = batchIds.get(section);
							const current: SectionTextPair = [
								section,
								extractMarkdownContent(section),
							];
							if (batchId === undefined) {
								const lastBatch = prev[last];
								if (lastBatch !== undefined) {
									const estimatedTokens = estimateTokens([
										...lastBatch.map(([, text]) => text),
										current[1],
									]);
									if (
										lastBatch.length < maxBatchSize &&
										estimatedTokens <= maxTokensPerBatch
									) {
										prev[last] = [...lastBatch, current];
									} else {
										prev.push([current]);
										last++;
									}
								} else {
									prev.push([current]);
								}
								batchIds.set(section, last);
							} else {
								// Element already has a batch, do nothing.
							}
						}

						for (const [section, batchId] of batchIds.entries()) {
							if (!currentSections.has(section)) {
								const batch = prev[batchId];
								if (!batch) {
									batchIds.delete(section);
									continue;
								}
								const index = batch.findIndex(([el]) => el === section);
								if (index !== -1) {
									prev[batchId] = [
										...batch.slice(0, index),
										...batch.slice(index + 1),
									];
								}
								batchIds.delete(section);
							}
						}

						return prev;
					});
				});
			},
			{ defer: true },
		),
	);

	return (
		<Index each={renderList()}>
			{(sections) => (
				<BatchRender sections={sections()} onDelete={props.onDelete} />
			)}
		</Index>
	);
};

interface BatchRenderProps {
	sections: SectionTextPair[];
	onDelete?: (section: DOMSection) => void;
}
const BatchRender = (props: BatchRenderProps) => {
	const { settings } = useSettings();
	const websiteRule = useWebsiteRule();
	const texts = createMemo(() => props.sections.map(([, text]) => text));
	const [getter, retry] = createBatchTranslation(texts, {
		promptId: PROMPT_ID.batchTranslate,
		modelId: () => settings.translate.inTextTranslateModel,
		srcLang: () => websiteRule.sourceLang || settings.translate.sourceLang,
		dstLang: () => websiteRule.targetLang || settings.translate.targetLang,
	});

	const hideOriginal = createMemo(
		() =>
			(websiteRule.translateMode ?? settings.translate.translationMode) ===
			"replace",
	);

	return (
		<For each={getter()}>
			{(item, index) => (
				<TranslationRender
					text={item()}
					loading={item.loading}
					error={item.error?.message}
					section={props.sections[index()][0]}
					hideOriginal={hideOriginal()}
					onRetry={() => {
						if (getter().every((i) => i.error)) {
							retry();
						} else {
							retry(index());
						}
					}}
					onDelete={() => props.onDelete?.(props.sections[index()][0])}
				/>
			)}
		</For>
	);
};

interface TranslationRenderProps {
	text?: string;
	loading?: boolean;
	error?: string;
	hideOriginal?: boolean;
	section: DOMSection;
	onRetry?: () => void;
	onDelete?: () => void;
}
const TranslationRender = (props: TranslationRenderProps) => {
	const [tooltipPos, setTooltipPos] = createSignal<{ x: number; y: number }>();
	const createTooltip = (e: MouseEvent | TouchEvent) => {
		e.preventDefault();
		e.stopPropagation();

		if (props.loading) return;
		if (tooltipPos()) return;
		let x: number, y: number;
		if (e instanceof MouseEvent) {
			x = e.clientX;
			y = e.clientY;
		} else {
			x = e.changedTouches[0].clientX;
			y = e.changedTouches[0].clientY;
		}
		setTooltipPos({
			x,
			y,
		});
	};
	const closeTooltip = () => {
		setTooltipPos(undefined);
	};

	const swapLine = createMemo(
		() =>
			!props.loading &&
			!props.error &&
			!props.hideOriginal &&
			((props.text || "").length > NEW_LINE_THRESHOLD ||
				props.text?.includes("\n")),
	);

	return (
		<>
			<InTextTooltip
				pos={tooltipPos()}
				error={props.error}
				onClose={closeTooltip}
				onCopyMarkdown={() => {
					if (props.text) {
						copyToClipboard(props.text);
					}
					closeTooltip();
				}}
				onRetry={() => {
					props.onRetry?.();
					closeTooltip();
				}}
				onDelete={() => {
					props.onDelete?.();
					closeTooltip();
				}}
			/>
			<TranslateNodePortal
				section={props.section}
				hideOriginal={props.hideOriginal && !props.loading && !props.error}
			>
				{swapLine() && <br />}
				<span
					on:mouseenter={createTooltip}
					on:touchend={createTooltip}
					style={{ display: "inline-block" }}
				>
					{props.loading ? (
						<NativeLoading />
					) : props.error ? (
						<CircleX style={ERROR_ICON_STYLE} size="12px" />
					) : (
						<Languages style={ICON_STYLE} size="12px" />
					)}
				</span>
				{!props.loading && !props.error && <Md text={props.text || ""} />}
			</TranslateNodePortal>
		</>
	);
};

const ICON_STYLE = {
	"vertical-align": "middle",
	margin: "0 4px",
	background: "rgba(0, 0, 0, 0.1)",
	"border-radius": "4px",
	padding: "2px",
};

const ERROR_ICON_STYLE = {
	...ICON_STYLE,
	background: "rgba(255, 0, 0, 0.1)",
};
