import { CircleX, Languages } from "lucide-solid";
import { extractMarkdownContent, extractTextContext } from "../context/element";
import { getPageContext } from "../context/page";
import { NativeButton } from "./Button";
import { NativeLoading } from "./Loading";
import { NativeTooltip } from "./Tooltip";

interface SingleProps {
	element: HTMLElement;
}
export const SingleInTextTranslation = (props: SingleProps) => {
	const { settings } = useSettings();
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

	const hideOriginal = () => settings.translate.translationMode === "replace";

	return (
		<TranslationRender
			text={text()}
			loading={loading()}
			error={error()}
			element={props.element}
			hideOriginal={hideOriginal()}
			onRetry={handleRetry}
		/>
	);
};

interface BatchProps {
	elements: Set<HTMLElement>;
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
					const maxBatchSize = settings.translate.maxBatchSize;

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
			{(elements) => <BatchRender elements={elements} />}
		</For>
	);
};

interface BatchRenderProps {
	elements: HTMLElement[];
}
const BatchRender = (props: BatchRenderProps) => {
	const { settings } = useSettings();
	const texts = createMemo(() =>
		props.elements.map((el) => extractMarkdownContent(el)),
	);
	const [store, retry] = useBatchTranslation(texts, getPageContext());

	const hideOriginal = () => settings.translate.translationMode === "replace";

	return (
		<For each={store}>
			{(item, index) => (
				<TranslationRender
					text={item.result}
					loading={item.loading}
					error={item.error}
					element={props.elements[index()]}
					hideOriginal={hideOriginal()}
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
	hideOriginal?: boolean;
	element: HTMLElement;
	onRetry?: () => void;
}
const TranslationRender = (props: TranslationRenderProps) => {
	createEffect(() => {
		const el = props.element;

		el.setAttribute(UNSET_CLAMP_STYLE, "");
		onCleanup(() => {
			el.removeAttribute(UNSET_CLAMP_STYLE);
		});
	});

	return (
		<MPortal
			mount={props.element}
			hideOriginal={props.hideOriginal && !props.loading && !props.error}
		>
			{!props.loading && !props.error && !props.hideOriginal && <br />}
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
						<Languages style={ICON_STYLE} size="12px" />
					) : (
						<CircleX style={ERROR_ICON_STYLE} size="12px" />
					)}
				</NativeButton>
			</NativeTooltip>
			{!props.loading && !props.error && <Md text={props.text || ""} />}
		</MPortal>
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
