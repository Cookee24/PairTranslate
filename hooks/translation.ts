import { isTranslateError } from "@/entrypoints/background/utils/errors";
import { useTaskList } from "./task-list";

interface Options extends TranslateOptions {
	stream?: boolean;
	floating?: boolean;
	queue?: boolean;
}
export function useTranslation(
	operation: () => Operation | undefined,
	options: Options = {},
) {
	const { add } = useTaskList();
	const { stream = false, floating = false } = options;
	const { settings, loading: settingsLoading } = useSettings();

	const [error, setError] = createSignal<string>();
	const [loading, setLoading] = createSignal(false);
	const [len, setLen] = createSignal(0);
	const [text, setText] = createSignal("");
	const [retry, setRetry] = createSignal<TranslateOptions | undefined>(
		undefined,
		{
			equals: false,
		},
	);

	createEffect(
		on(
			[retry, settingsLoading, operation],
			async ([currentRetry, isSettingsLoading, op]) => {
				if (isSettingsLoading) return;
				if (!op) return;
				const cleanCache =
					currentRetry?.cleanCache ?? options.cleanCache ?? false;

				if (op.type === "custom") {
					setError(t("errors.additional.customOperationNotSupported"));
					return;
				}

				const isExplain = op.type === "explain";

				const modelId = isExplain
					? floating && settings.translate.floatingExplainModel
					: floating
						? settings.translate.floatingTranslateModel
						: settings.translate.inTextTranslateModel;

				if (!modelId) {
					setError(t("settings.translation.noModel"));
					return;
				}

				let task = emptyTask();
				if (options.queue ?? true) {
					task = add();
				}

				let cancelled = false;
				onCleanup(() => {
					task.terminate();
					cancelled = true;
				});

				try {
					setLoading(true);
					setError(undefined);
					setText("");
					setLen(0);

					await task.wait();

					if (stream) {
						const listener = isExplain
							? window.rpc.streamExplain(
									modelId,
									op.textContext,
									op.pageContext,
									{ cleanCache },
								)
							: window.rpc.streamTranslate(
									modelId,
									op.textContext,
									op.pageContext,
									{ cleanCache },
								);

						for await (const chunk of listener) {
							if (cancelled) return;
							setText((t) => t + chunk);
							setLen((l) => l + chunk.length);
						}
					} else {
						const response = isExplain
							? await window.rpc.explain(
									modelId,
									op.textContext,
									op.pageContext,
									{ cleanCache },
								)
							: await window.rpc.translate(
									modelId,
									op.textContext,
									op.pageContext,
									{ cleanCache },
								);

						setText(response);
						setLen(response.length);
					}
				} catch (error) {
					if (error instanceof Error) {
						setError(error.message);
					} else if (isTranslateError(error)) {
						// Build error message with code if available
						let msg = "";
						if (error.code) msg += `[${error.code}] `;
						msg += error.message;
						setError(msg);
					} else {
						setError(JSON.stringify(error, null, 2));
					}
				} finally {
					task.done();
					setLoading(false);
				}
			},
		),
	);

	return [text, { error, loading, len, retry: setRetry }] as const;
}

interface BatchOptions extends TranslateOptions {
	floating?: boolean;
	queue?: boolean;
}

interface TranslationState {
	origin: string;
	result?: string;
	loading: boolean;
	error?: string;
}

export function useBatchTranslation(
	texts: () => string[],
	pageContext?: PageContext,
	options: BatchOptions = {},
) {
	const { add } = useTaskList();
	const { floating = false } = options;
	const { settings, loading: settingsLoading } = useSettings();

	const [store, setStore] = createStore<TranslationState[]>([]);
	const [retry, setRetry] = createSignal<TranslateOptions>(
		{},
		{ equals: false },
	);

	createEffect(
		on(
			[texts, retry, settingsLoading],
			async ([textArray, currentRetry, isSettingsLoading]) => {
				if (isSettingsLoading) return;

				if (!textArray || textArray.length === 0) {
					if (store.length > 0) setStore([]);
					return;
				}

				const cleanCache =
					currentRetry.cleanCache ?? options.cleanCache ?? false;
				const isFullRetry = Object.keys(currentRetry).length > 0;

				const modelId = floating
					? settings.translate.floatingTranslateModel
					: settings.translate.inTextTranslateModel;

				if (!modelId) {
					const errorMsg = t("settings.translation.noModel");
					setStore(
						{ from: 0, to: textArray.length - 1 },
						{ loading: false, error: errorMsg },
					);
					return;
				}

				const translationRequests: [string, number][] = [];

				const newStoreState = textArray.map((text, index) => {
					const existing = store[index];
					// Keep existing state if text is unchanged, not in error, and not a full retry
					if (
						!isFullRetry &&
						existing?.origin === text &&
						!existing.error &&
						!existing.loading
					) {
						return existing;
					}
					translationRequests.push([text, index]);
					return {
						origin: text,
						loading: true,
						result: existing?.result, // Preserve old result to prevent flickering
						error: undefined,
					};
				});

				// Reconcile the store: SolidJS will only update what has changed.
				if (
					translationRequests.length > 0 ||
					store.length !== textArray.length
				) {
					setStore(reconcile(newStoreState));
				}

				if (translationRequests.length === 0) {
					if (isFullRetry) setRetry({}); // Reset retry signal if it was used
					return;
				}

				let task = emptyTask();
				if (options.queue ?? true) {
					task = add();
				}

				let cancelled = false;
				onCleanup(() => {
					task.terminate();
					cancelled = true;
				});

				try {
					await task.wait();
					if (cancelled) return;

					const textsToTranslate = translationRequests.map((req) => req[0]);
					const response = await window.rpc.batchTranslate(
						modelId,
						textsToTranslate,
						pageContext,
						{ cleanCache },
					);

					if (cancelled) return;

					batch(() => {
						for (let i = 0; i < response.length; i++) {
							const originalIndex = translationRequests[i][1];
							setStore(originalIndex, {
								loading: false,
								result: response[i],
							});
						}
					});
				} catch (error) {
					let errorMsg = "";
					if (error instanceof Error) {
						errorMsg = error.message;
					} else if (isTranslateError(error)) {
						if (error.code) errorMsg += `[${error.code}] `;
						errorMsg += error.message;
					} else {
						errorMsg = JSON.stringify(error, null, 2);
					}

					batch(() => {
						translationRequests.forEach(([_, index]) => {
							setStore(index, { loading: false, error: errorMsg });
						});
					});
				} finally {
					task.done();
					if (isFullRetry) setRetry({});
				}
			},
		),
	);

	const retryAll = (options: TranslateOptions = {}) => {
		setRetry(options);
	};

	const retrySingle = async (
		index: number,
		translateOptions: TranslateOptions = {},
	) => {
		const textArray = texts();
		const textToTranslate = textArray[index];

		if (!textToTranslate) return;

		const singleOperation: Operation = {
			type: "translate",
			pageContext,
			textContext: {
				content: textToTranslate,
				before: "",
				after: "",
			},
		};

		const modelId = floating
			? settings.translate.floatingTranslateModel
			: settings.translate.inTextTranslateModel;

		if (!modelId) {
			setStore(index, "error", t("settings.translation.noModel"));
			return;
		}

		let task = emptyTask();
		if (options.queue ?? true) {
			task = add();
		}

		try {
			// Update store, preserving previous result while loading
			setStore(index, {
				origin: textToTranslate,
				loading: true,
				error: undefined,
				result: store[index]?.result,
			});

			await task.wait();

			const response = await window.rpc.translate(
				modelId,
				singleOperation.textContext,
				singleOperation.pageContext,
				{
					...translateOptions,
					cleanCache: translateOptions.cleanCache ?? options.cleanCache,
				},
			);

			setStore(index, { result: response, loading: false });
		} catch (error) {
			let errorMsg = "";
			if (error instanceof Error) {
				errorMsg = error.message;
			} else if (isTranslateError(error)) {
				if (error.code) errorMsg += `[${error.code}] `;
				errorMsg += error.message;
			} else {
				errorMsg = JSON.stringify(error, null, 2);
			}

			setStore(index, { error: errorMsg, loading: false });
		} finally {
			task.done();
		}
	};

	return [store, { single: retrySingle, all: retryAll }] as const;
}

export function useInputTranslation(
	text: () => string,
	targetLang?: () => string,
	pageContext?: () => PageContext | undefined,
) {
	const { settings, loading: settingsLoading } = useSettings();

	const [error, setError] = createSignal<string>();
	const [loading, setLoading] = createSignal(false);
	const [result, setResult] = createSignal("");
	const [retry, setRetry] = createSignal<boolean>(false, { equals: false });

	createEffect(
		on(
			[
				retry,
				settingsLoading,
				text,
				() => targetLang?.(),
				() => pageContext?.(),
			],
			async ([, isSettingsLoading, inputText, lang, context]) => {
				if (isSettingsLoading) return;
				if (!inputText || inputText.trim() === "") {
					setResult("");
					setError(undefined);
					return;
				}

				const modelId = settings.translate.inputTranslateModel;

				if (!modelId) {
					setError(t("settings.translation.noModel"));
					return;
				}

				let cancelled = false;
				onCleanup(() => {
					cancelled = true;
				});

				try {
					setLoading(true);
					setError(undefined);
					setResult("");

					const listener = window.rpc.streamInputTranslate(
						modelId,
						inputText,
						context,
						lang,
					);

					for await (const chunk of listener) {
						if (cancelled) return;
						setResult((r) => r + chunk);
					}
				} catch (error) {
					if (error instanceof Error) {
						setError(error.message);
					} else if (isTranslateError(error)) {
						let msg = "";
						if (error.code) msg += `[${error.code}] `;
						msg += error.message;
						setError(msg);
					} else {
						setError(JSON.stringify(error, null, 2));
					}
				} finally {
					setLoading(false);
				}
			},
		),
	);

	return [result, { error, loading, retry: () => setRetry(true) }] as const;
}
