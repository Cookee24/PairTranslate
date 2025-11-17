import { ifBatchRequestSupported } from "@/utils/if-batch";
import { useTaskList } from "./task-list";
import { useWebsiteRule } from "./website-rule";

interface Options {
	stream?: boolean;
	floating?: boolean;
	queue?: boolean;
	cleanCache?: boolean;
}

export function useTranslation(
	operation: () => Operation | undefined,
	options: Options = {},
) {
	const { add } = useTaskList();
	const { stream = false, floating = false } = options;
	const { settings, loading: settingsLoading } = useSettings();
	const websiteRule = useWebsiteRule();

	const [error, setError] = createSignal<string>();
	const [loading, setLoading] = createSignal(false);
	const [len, setLen] = createSignal(0);
	const [text, setText] = createSignal("");
	const [retry, setRetry] = createSignal<{ cleanCache?: boolean } | undefined>(
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
						: (websiteRule.inTextTranslateModel ??
							settings.translate.inTextTranslateModel);

				if (!modelId) {
					setError(t("settings.translation.noModel"));
					return;
				}

				const promptId = isExplain ? PROMPT_ID.explain : PROMPT_ID.translate;

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

					const translateOptions: TranslateOptions = {
						modelId,
						promptId,
						cleanCache,
						sourceLang: websiteRule.sourceLang ?? settings.translate.sourceLang,
						targetLang: websiteRule.targetLang ?? settings.translate.targetLang,
					};

					if (stream) {
						const listener = window.rpc.stream(
							[op.pageContext, op.textContext],
							translateOptions,
						);

						for await (const chunk of listener) {
							if (cancelled) return;
							setText((t) => t + chunk);
							setLen((l) => l + chunk.length);
						}
					} else {
						const response = await window.rpc.unary(
							[op.pageContext, op.textContext],
							translateOptions,
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

interface BatchOptions {
	floating?: boolean;
	queue?: boolean;
	cleanCache?: boolean;
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
	const { settings } = useSettings();
	const websiteRule = useWebsiteRule();

	const [store, setStore] = createStore<TranslationState[]>([]);
	const [retry, setRetry] = createSignal<{ cleanCache?: boolean }>(
		{},
		{ equals: false },
	);

	createEffect(
		on([texts, retry], async ([textArray, currentRetry]) => {
			if (!textArray || textArray.length === 0) {
				if (store.length > 0) setStore([]);
				return;
			}

			const cleanCache = currentRetry.cleanCache ?? options.cleanCache ?? false;
			const isFullRetry = Object.keys(currentRetry).length > 0;

			const modelId = floating
				? settings.translate.floatingTranslateModel
				: (websiteRule.inTextTranslateModel ??
					settings.translate.inTextTranslateModel);

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
			if (translationRequests.length > 0 || store.length !== textArray.length) {
				setStore(reconcile(newStoreState));
			}

			if (translationRequests.length === 0) {
				if (isFullRetry) setRetry({}); // Reset retry signal if it was used
				return;
			}

			let task = emptyTask();
			if (options.queue ?? true) {
				const weight = ifBatchRequestSupported(
					settings.services.traditionalServices[modelId]?.apiSpec,
				)
					? undefined
					: settings.translate.maxBatchSize;
				task = add(weight);
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

				const translateOptions: TranslateOptions = {
					modelId,
					promptId: PROMPT_ID.batchTranslate,
					cleanCache,
					sourceLang: websiteRule.sourceLang ?? settings.translate.sourceLang,
					targetLang: websiteRule.targetLang ?? settings.translate.targetLang,
				};

				const response = await window.rpc.batch(
					[pageContext, textsToTranslate],
					translateOptions,
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
		}),
	);

	const retryAll = (retryOptions: { cleanCache?: boolean } = {}) => {
		setRetry(retryOptions);
	};

	const retrySingle = async (
		index: number,
		retryOptions: { cleanCache?: boolean } = {},
	) => {
		const textArray = texts();
		const textToTranslate = textArray[index];

		if (!textToTranslate) return;

		const textContext: TextContext = {
			content: textToTranslate,
			before: "",
			after: "",
		};

		const modelId = floating
			? settings.translate.floatingTranslateModel
			: (websiteRule.inTextTranslateModel ??
				settings.translate.inTextTranslateModel);

		if (!modelId) {
			setStore(index, "error", t("settings.translation.noModel"));
			return;
		}

		let task = emptyTask();
		if (options.queue ?? true) {
			const weight = ifBatchRequestSupported(
				settings.services.traditionalServices[modelId]?.apiSpec,
			)
				? undefined
				: settings.translate.maxBatchSize;
			task = add(weight);
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

			const translateOptions: TranslateOptions = {
				modelId,
				promptId: PROMPT_ID.translate,
				cleanCache: retryOptions.cleanCache ?? options.cleanCache ?? false,
				sourceLang: websiteRule.sourceLang ?? settings.translate.sourceLang,
				targetLang: websiteRule.targetLang ?? settings.translate.targetLang,
			};

			const response = await window.rpc.unary(
				[pageContext, textContext],
				translateOptions,
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
	const websiteRule = useWebsiteRule();

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

					const textContext: TextContext = {
						content: inputText,
						before: "",
						after: "",
					};

					const translateOptions: TranslateOptions = {
						modelId,
						promptId: PROMPT_ID.inputTranslate,
						cleanCache: false,
						sourceLang: websiteRule.sourceLang ?? settings.translate.sourceLang,
						targetLang:
							lang ||
							websiteRule.targetLang ||
							settings.translate.inputTranslateLang ||
							settings.translate.targetLang,
					};

					const listener = window.rpc.stream(
						[context, textContext],
						translateOptions,
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
