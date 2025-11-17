import { getPageContext } from "@/utils/page-context";

type Pending = {
	(): undefined;
	loading: true;
	error: undefined;
};
type Error = {
	(): undefined;
	loading: false;
	error: TranslateError;
};
type Success<T> = {
	(): T;
	loading: false;
	error: undefined;
};
type Result<T> = Pending | Error | Success<T>;

type BatchReturn = readonly [
	() => Result<string>[],
	retry: (index: number | undefined) => void,
];

const noModelError = () =>
	createTranslateError(
		TranslateErrorType.MODEL_NOT_FOUND,
		"In-text model not configured",
	);

// Helper to get translation context
const useTranslationContext = (modelIdOverride?: () => string | undefined) => {
	const websiteRule = useWebsiteRule();
	const { settings } = useSettings();

	const modelId = () =>
		modelIdOverride?.() ||
		websiteRule.inTextTranslateModel ||
		settings.translate.inTextTranslateModel;

	const srcLang = () => websiteRule.sourceLang || settings.translate.sourceLang;
	const dstLang = () => websiteRule.targetLang || settings.translate.targetLang;
	const pageContext = { page: getPageContext() };

	return [modelId, srcLang, dstLang, pageContext] as const;
};

export function createBatchTranslation(
	text: () => string[],
	options: {
		modelId?: () => string | undefined;
		promptId?: string;
	},
): BatchReturn {
	const [modelId, srcLang, dstLang, pageContext] = useTranslationContext(
		options.modelId,
	);
	const promptId = options.promptId || PROMPT_ID.batchTranslate;

	const [textResult, setTextResult] = createStore<(string | undefined)[]>([]);
	const [error, setError] = createStore<(TranslateError | undefined)[]>([]);

	const setAllError = (e: TranslateError, len: number) =>
		batch(() => {
			setError({ to: len - 1 }, e);
			setTextResult({ to: len - 1 }, undefined);
		});

	const setAllLoading = (len: number) =>
		batch(() => {
			setError({ to: len - 1 }, undefined);
			setTextResult({ to: len - 1 }, undefined);
		});

	const setResultTexts = (texts: string[]) =>
		batch(() => {
			setError({ to: texts.length - 1 }, undefined);
			setTextResult(texts);
		});

	const translate = async (texts: string[], cleanCache = false) => {
		const modelId_ = modelId();
		if (modelId_ === undefined) {
			setAllError(noModelError(), texts.length);
			return;
		}

		setAllLoading(texts.length);
		try {
			const resp = await window.rpc.unary(texts, pageContext, {
				modelId: modelId_,
				promptId,
				srcLang: srcLang(),
				dstLang: dstLang(),
				cleanCache,
			});
			setResultTexts(resp);
		} catch (e) {
			setAllError(convertGenericError(e), texts.length);
		}
	};

	const translateSingle = async (index: number, text_: string) => {
		const modelId_ = modelId();
		if (modelId_ === undefined) {
			batch(() => {
				setError(index, noModelError());
				setTextResult(index, undefined);
			});
			return;
		}

		batch(() => {
			setError(index, undefined);
			setTextResult(index, undefined);
		});

		try {
			const resp = await window.rpc.unary([text_], pageContext, {
				modelId: modelId_,
				promptId,
				srcLang: srcLang(),
				dstLang: dstLang(),
				cleanCache: true,
			});
			batch(() => {
				setError(index, undefined);
				setTextResult(index, resp);
			});
		} catch (e) {
			batch(() => {
				setError(index, convertGenericError(e));
				setTextResult(index, undefined);
			});
		}
	};

	createEffect(() => {
		const text_ = text();
		if (text_.length === 0) {
			batch(() => {
				setError([]);
				setTextResult([]);
			});
			return;
		}
		translate(text_);
	});

	const retry = (index: number | undefined) => {
		const text_ = text();
		if (text_.length === 0) return;

		if (index === undefined) {
			translate(text_, true);
		} else if (index >= 0 && index < text_.length) {
			translateSingle(index, text_[index]);
		}
	};

	const ret = () => {
		const len = text().length;
		return Array.from({ length: len }, (_, i) => {
			function read(): string | undefined {
				return textResult[i];
			}

			Object.defineProperties(read, {
				error: {
					get() {
						return error[i];
					},
				},
				loading: {
					get() {
						// Access each store explicitly to track reactivity
						const hasResult = textResult[i] !== undefined;
						const hasError = error[i] !== undefined;
						return !hasResult && !hasError;
					},
				},
			});

			return read as Result<string>;
		});
	};

	return [ret, retry];
}

type SingleReturn<T> = readonly [Result<T>, retry: () => void];
type SingleStreamReturn<T> = readonly [
	Result<T> & { len: () => number },
	retry: () => void,
];

export function createTranslation<T extends string>(
	text: () => string,
	options: {
		stream: true;
		modelId?: () => string | undefined;
		promptId?: string;
	},
): SingleStreamReturn<T>;
export function createTranslation<T>(
	text: () => string,
	options: {
		stream: false;
		modelId?: () => string | undefined;
		promptId?: string;
	},
): SingleReturn<T>;
export function createTranslation<T>(
	text: () => string,
	options: {
		stream?: boolean;
		modelId?: () => string | undefined;
		promptId?: string;
	} = {},
): SingleReturn<T> | SingleStreamReturn<T> {
	const [modelId, srcLang, dstLang, pageContext] = useTranslationContext(
		options.modelId,
	);
	const promptId = options.promptId || PROMPT_ID.translate;

	const [result, setResult] = createSignal<T>();
	const [error, setError] = createSignal<TranslateError>();
	const [len, setLen] = createSignal(0);

	const setLoading = () =>
		batch(() => {
			setError(undefined);
			setResult(undefined);
		});

	const setResultVal = (val: T) =>
		batch(() => {
			setError(undefined);
			setResult(() => val);
		});

	const setErrorVal = (e: TranslateError) =>
		batch(() => {
			setError(() => e);
			setResult(undefined);
		});

	const translateStream = async (text_: string, cleanCache?: boolean) => {
		const modelId_ = modelId();
		if (modelId_ === undefined) {
			setErrorVal(noModelError());
			return;
		}

		setLoading();
		const listener = window.rpc.stream(text_, pageContext, {
			modelId: modelId_,
			promptId,
			srcLang: srcLang(),
			dstLang: dstLang(),
			cleanCache,
		});
		onCleanup(listener.return);

		try {
			setLen(0);
			for await (const chunk of listener) {
				batch(() => {
					setError(undefined);
					setResult((prev) => (prev || "") + chunk);
					setLen((prev: number) => prev + chunk.length);
				});
			}
		} catch (e) {
			setErrorVal(convertGenericError(e));
		}
	};

	const translateUnary = async (text_: string, cleanCache?: boolean) => {
		const modelId_ = modelId();
		if (modelId_ === undefined) {
			setErrorVal(noModelError());
			return;
		}

		setLoading();
		try {
			const resp = await window.rpc.unary([text_], pageContext, {
				modelId: modelId_,
				promptId,
				srcLang: srcLang(),
				dstLang: dstLang(),
				cleanCache,
			});
			setResultVal(resp);
		} catch (e) {
			setErrorVal(convertGenericError(e));
		}
	};

	const doTranslate = (text_: string, cleanCache?: boolean) =>
		options.stream
			? translateStream(text_, cleanCache)
			: translateUnary(text_, cleanCache);

	createEffect(() => {
		const text_ = text();
		if (text_.length === 0) {
			batch(() => {
				setError(undefined);
				setResult(undefined);
			});
			return;
		}
		doTranslate(text_);
	});

	const retry = () => {
		const text_ = text();
		if (text_.length === 0) return;
		doTranslate(text_, true);
	};

	function read(): T | undefined {
		return result();
	}

	Object.defineProperties(read, {
		error: {
			get() {
				return error();
			},
		},
		loading: {
			get() {
				// Access each signal explicitly to track reactivity
				const hasResult = result() !== undefined;
				const hasError = error() !== undefined;
				return !hasResult && !hasError;
			},
		},
		...(options.stream && {
			len: {
				get() {
					return len();
				},
			},
		}),
	});

	return [read as Result<T>, retry];
}
