import { CircleX, Languages } from "lucide-solid";
import InTextTooltip from "../components/InTextTooltip";
import { extractTextContext } from "../context/element";
import { NativeLoading } from "./Loading";

interface SingleProps {
	element: HTMLElement;
}
export const SingleInTextTranslation = (props: SingleProps) => {
	const { settings } = useSettings();
	const websiteRule = useWebsiteRule();

	const context = createMemo(() => extractTextContext(props.element));
	const [data, retry] = createTranslation(() => context().text);

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
			element={props.element}
			hideOriginal={hideOriginal()}
			onRetry={handleRetry}
		/>
	);
};

interface BatchProps {
	elements: Set<HTMLElement>;
	onDelete?: (element: HTMLElement) => void;
}
export const BatchInTextTranslation = (props: BatchProps) => {
	const { settings } = useSettings();
	const [renderList, setRenderList] = createSignal([] as HTMLElement[][], {
		equals: false,
	});

	let lastTimeout: NodeJS.Timeout | null = null;
	let lastIdleCallback: number | null = null;
	let lastAnimationFrame: number | null = null;
	const throttle = (fn: () => void) => {
		const DELAY = 200;
		if (lastTimeout) clearTimeout(lastTimeout);
		if (lastIdleCallback) cancelIdleCallback(lastIdleCallback);
		if (lastAnimationFrame) cancelAnimationFrame(lastAnimationFrame);

		lastTimeout = setTimeout(() => {
			lastIdleCallback = requestIdleCallback(
				() => {
					lastIdleCallback = null;
					lastAnimationFrame = requestAnimationFrame(() => {
						lastAnimationFrame = null;
						fn();
					});
				},
				{ timeout: DELAY },
			);
		}, DELAY);
	};

	const batchIds = new Map<HTMLElement, number>();

	const clear = () => {
		lastTimeout && clearTimeout(lastTimeout);
		lastIdleCallback && cancelIdleCallback(lastIdleCallback);
		lastAnimationFrame && cancelAnimationFrame(lastAnimationFrame);
		setRenderList([]);
		batchIds.clear();
	};

	createEffect(
		on(
			[() => props.elements],
			([currentElements]) => {
				throttle(() => {
					const maxBatchSize = settings.queue.maxBatchSize;

					if (currentElements.size === 0) clear();

					setRenderList((prev) => {
						let last = prev.length; // Force a new batch
						for (const element of currentElements) {
							const batchId = batchIds.get(element);
							if (batchId === undefined) {
								const lastBatch = prev[last];
								if (lastBatch !== undefined) {
									if (lastBatch.length < maxBatchSize) {
										prev[last] = [...lastBatch, element];
									} else {
										prev.push([element]);
										last++;
									}
								} else {
									prev.push([element]);
								}
								batchIds.set(element, last);
							} else {
								// Element already has a batch, do nothing.
							}
						}

						for (const [element, batchId] of batchIds.entries()) {
							if (!currentElements.has(element)) {
								const batch = prev[batchId];
								const index = batch.indexOf(element);
								if (index !== -1) {
									prev[batchId] = [
										...batch.slice(0, index),
										...batch.slice(index + 1),
									];
								}
								batchIds.delete(element);
							}
						}

						return prev;
					});
				});
			},
			{ defer: true },
		),
	);

	onCleanup(() => clear());

	return (
		<For each={renderList()}>
			{(elements) => (
				<BatchRender elements={elements} onDelete={props.onDelete} />
			)}
		</For>
	);
};

interface BatchRenderProps {
	elements: HTMLElement[];
	onDelete?: (element: HTMLElement) => void;
}
const BatchRender = (props: BatchRenderProps) => {
	const { settings } = useSettings();
	const websiteRule = useWebsiteRule();
	const texts = createMemo(() =>
		props.elements.map((el) => extractMarkdownContent(el)),
	);
	const [geter, retry] = createBatchTranslation(texts);

	const hideOriginal = () =>
		(websiteRule.translateMode ?? settings.translate.translationMode) ===
		"replace";
	
	createEffect(() => {
		const texts = geter();
		for (let i = 0; i < texts.length; i++) {
			console.log("Translated Text:", {
				loading: texts[i].loading,
				error: texts[i].error,
				text: texts[i](),
			});
		}
	})

	return (
		<For each={geter()}>
			{(item, index) => (
				<TranslationRender
					text={item()}
					loading={item.loading}
					error={item.error?.message}
					element={props.elements[index()]}
					hideOriginal={hideOriginal()}
					onRetry={() => retry(index())}
					onDelete={() => props.onDelete?.(props.elements[index()])}
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
	element: HTMLElement;
	onRetry?: () => void;
	onDelete?: () => void;
}
const TranslationRender = (props: TranslationRenderProps) => {
	createEffect(() => {
		const el = props.element;

		el.setAttribute(ELEMENT_TRANSLATED, "");
		onCleanup(() => {
			el.removeAttribute(ELEMENT_TRANSLATED);
		});
	});

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
			<InTextPortal
				mount={props.element}
				hideOriginal={props.hideOriginal && !props.loading && !props.error}
			>
				{!props.loading && !props.error && !props.hideOriginal && <br />}
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
			</InTextPortal>
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
