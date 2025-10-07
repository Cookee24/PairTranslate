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
			[retry, settingsLoading, texts],
			async ([currentRetry, isSettingsLoading, textArray]) => {
				if (isSettingsLoading) return;
				if (!textArray || textArray.length === 0) {
					setStore([]);
					return;
				}

				const cleanCache =
					currentRetry.cleanCache ?? options.cleanCache ?? false;

				const modelId = floating
					? settings.translate.floatingTranslateModel
					: settings.translate.inTextTranslateModel;

				if (!modelId) {
					const errorMsg = t("settings.translation.noModel");
					setStore(textArray.map(() => ({ loading: false, error: errorMsg })));
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
					setStore(textArray.map(() => ({ loading: true })));

					await task.wait();

					if (cancelled) return;

					const response = await window.rpc.batchTranslate(
						modelId,
						textArray,
						pageContext,
						{ cleanCache },
					);

					setStore(response.map((result) => ({ result, loading: false })));
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

					setStore(textArray.map(() => ({ loading: false, error: errorMsg })));
				} finally {
					task.done();
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

		const singleOperation: Operation = {
			type: "translate",
			pageContext,
			textContext: {
				content: textArray[index],
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
			setStore(index, { loading: true, error: undefined });

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
