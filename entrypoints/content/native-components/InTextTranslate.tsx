import { CircleX, Languages } from "lucide-solid";
import { extractTextContent, extractTextContext } from "../context/element";
import { getPageContext } from "../context/page";
import { NativeButton } from "./Button";
import { NativeLoading } from "./Loading";
import { NativeTooltip } from "./Tooltip";

interface SingleProps {
	element: HTMLElement;
}
export const SingleInTextTranslation = (props: SingleProps) => {
	const [operation, setOperation] = createSignal<Operation>();
	const [text, { loading, error, retry }] = useTranslation(operation, {
		stream: false,
		floating: false,
	});

	createEffect(() => {
		const el = props.element;
		const pageContext = getPageContext();
		const textContext = extractTextContext(el);
		setOperation({
			type: "translate",
			textContext,
			pageContext,
		});
		onCleanup(() => setOperation(undefined));
	});

	const handleRetry = () => {
		if (error() && !loading()) {
			retry({ cleanCache: false });
		} else if (!error() && !loading()) {
			retry({ cleanCache: true });
		}
	};

	return (
		<TranslationRender
			text={text()}
			loading={loading()}
			error={error()}
			element={props.element}
			onRetry={handleRetry}
		/>
	);
};

interface BatchProps {
	elements: Set<HTMLElement>;
}
export const BatchInTextTranslation = (props: BatchProps) => {
	const { settings } = useSettings();
	const [renderList, setRenderList] = createSignal([[]] as HTMLElement[][], {
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
		setRenderList([[]]);
		batchIds.clear();
	};

	createEffect(
		on(
			[() => props.elements],
			([currentElements]) => {
				throttle(() => {
					const maxBatchSize = settings.translate.maxBatchSize;

					if (currentElements.size === 0) clear();

					setRenderList((prev) => {
						for (const element of currentElements) {
							let batchId = batchIds.get(element);
							if (batchId === undefined) {
								// biome-ignore lint/style/noNonNullAssertion: list initialized as [[]]
								const lastBatch = prev[prev.length - 1]!;
								if (lastBatch.length >= maxBatchSize) {
									batchId = prev.length;
									prev.push([element]);
								} else {
									batchId = prev.length - 1;
									prev[batchId] = [...lastBatch, element];
								}
								batchIds.set(element, batchId);
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
			{(elements) => <BatchRender elements={elements} />}
		</For>
	);
};

interface BatchRenderProps {
	elements: HTMLElement[];
}
const BatchRender = (props: BatchRenderProps) => {
	const texts = createMemo(() =>
		props.elements.map((el) => extractTextContent(el)),
	);
	const [store, retry] = useBatchTranslation(texts, getPageContext());

	return (
		<For each={store}>
			{(item, index) => (
				<TranslationRender
					text={item.result}
					loading={item.loading}
					error={item.error}
					element={props.elements[index()]}
					onRetry={() => retry.single(index(), { cleanCache: true })}
				/>
			)}
		</For>
	);
};

interface TranslationRenderProps {
	text?: string;
	loading?: boolean;
	error?: string;
	element: HTMLElement;
	onRetry?: () => void;
}
const TranslationRender = (props: TranslationRenderProps) => {
	let ref: HTMLElement | undefined;

	createEffect(
		on([() => props.loading, () => props.error], ([loading, error]) => {
			if (!ref) return;
			const parent = props.element;
			if (loading || error) {
				ref.style.display = "inline-block";
				return;
			} else {
				ref.style.display = "block";
			}

			parent.style.webkitLineClamp = "unset";
			parent.style.maxHeight = "unset";
		}),
	);

	return (
		<MPortal
			useShadow
			mount={props.element}
			ref={(el) => {
				el.setAttribute(ELEMENT_CONTAINER, "");
				el.style.margin = "0";
				el.style.padding = "0";
				ref = el;
			}}
		>
			<NativeTooltip
				visible={!props.loading}
				content={
					props.error ? (
						<span
							style={{
								"font-family": "monospace",
								color: "rgb(255, 127, 127)",
							}}
						>
							{props.error}
						</span>
					) : (
						t("common.retry")
					)
				}
			>
				<NativeButton
					onclick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						props.onRetry?.();
					}}
				>
					{props.loading ? (
						<NativeLoading />
					) : !props.loading && !props.error ? (
						<Languages style={ICON_STYLE} size={12} />
					) : (
						<CircleX style={ERROR_ICON_STYLE} size={12} />
					)}
				</NativeButton>
			</NativeTooltip>
			{!props.loading && !props.error && <TextRender text={props.text} />}
		</MPortal>
	);
};

const TextRender = (props: { text?: string }) => {
	const [textList, setTextList] = createSignal<string[]>([]);

	createEffect(() => {
		const text = props.text;
		if (!text) {
			setTextList([]);
			return;
		}
		const parts = text.split("\n").filter((part) => part.trim() !== "");
		setTextList(parts);
	});

	return (
		<For each={textList()}>
			{(part, index) => (
				<>
					{part}
					{index() < textList().length - 1 && <br />}
				</>
			)}
		</For>
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
