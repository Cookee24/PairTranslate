import {
	batch,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	untrack,
} from "solid-js";
import { createStore } from "solid-js/store";
import { useSettings } from "~/hooks/settings";
import { useWebsiteRule } from "~/hooks/website-rule";
import { PROMPT_ID } from "~/utils/constants";
import {
	convertGenericError,
	createTranslateError,
	type TranslateError,
	TranslateErrorType,
} from "~/utils/errors";
import { t } from "~/utils/i18n";
import { getPageContext } from "~/utils/page-context";
import type { TranslateContext } from "~/utils/types";
import { useProgressIndicator } from "./progress-indicator";

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
	retry: (index?: number) => void,
];

type TranslateUnaryPayload<T> =
	| T
	| {
			output: T;
			reasoning?: string;
	  };

const normalizeUnaryResponse = <T>(
	resp: TranslateUnaryPayload<T>,
): { output: T; reasoning?: string } => {
	if (resp && typeof resp === "object" && "output" in resp) {
		return resp as { output: T; reasoning?: string };
	}
	return {
		output: resp as T,
		reasoning: undefined,
	};
};

type TranslationStreamChunk = {
	content?: string;
	reasoning?: string;
};

const noModelError = () =>
	createTranslateError(
		TranslateErrorType.MODEL_NOT_FOUND,
		t("errors.translationModelRequired"),
	);
const batchMismatchError = (exp: number, got: number) =>
	createTranslateError(
		TranslateErrorType.VALIDATION_ERROR,
		`Expected ${exp} translations, but got ${got}`,
	);

// Helper to get translation context
const useTranslationContext = (
	modelIdOverride?: () => string | undefined,
	srcLangOverride?: () => string | undefined,
	dstLangOverride?: () => string | undefined,
) => {
	const websiteRule = useWebsiteRule();
	const { settings } = useSettings();

	const modelId = () =>
		modelIdOverride
			? modelIdOverride()
			: websiteRule.inTextTranslateModel ||
				settings.translate.inTextTranslateModel;

	const srcLang = () =>
		srcLangOverride?.() ||
		websiteRule.sourceLang ||
		settings.translate.sourceLang;
	const dstLang = () =>
		dstLangOverride?.() ||
		websiteRule.targetLang ||
		settings.translate.targetLang;

	return [modelId, srcLang, dstLang] as const;
};

export function createBatchTranslation(
	text: () => string[],
	options: {
		promptId?: string;
		modelId?: () => string | undefined;
		srcLang?: () => string | undefined;
		dstLang?: () => string | undefined;
		thinCache?: boolean;
		ctx?: () => Record<string, unknown>;
	} = {},
): BatchReturn {
	const [modelId, srcLang, dstLang] = useTranslationContext(
		options.modelId,
		options.srcLang,
		options.dstLang,
	);
	const promptId = options.promptId || PROMPT_ID.batchTranslate;
	const ctx = options.ctx || (() => ({ page: getPageContext() }));
	const thinCache = options.thinCache ?? true;
	const { beginRequest } = useProgressIndicator();

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
	const clearAll = () =>
		batch(() => {
			setError([]);
			setTextResult([]);
		});

	const translate = (texts: string[], cleanCache = false) => {
		const modelId_ = modelId();
		if (modelId_ === undefined) {
			setAllError(noModelError(), texts.length);
			return;
		}

		const endTracking = beginRequest(modelId_);
		setAllLoading(texts.length);

		const abortController = new AbortController();
		const request = window.rpc.unary(
			ctx(),
			{
				modelId: modelId_,
				promptId,
				srcLang: srcLang(),
				dstLang: dstLang(),
				cleanCache,
				thinCache,
			},
			texts,
			abortController.signal,
		);
		onCleanup(() => abortController.abort());

		request
			.then((resp) => {
				const normalized = normalizeUnaryResponse<string[]>(resp);
				const translated = Array.isArray(normalized.output)
					? normalized.output
					: [normalized.output];
				setResultTexts(translated);
				translated.length < texts.length &&
					batch(() => {
						setError(
							{ from: translated.length, to: texts.length - 1 },
							batchMismatchError(texts.length, translated.length),
						);
						setTextResult(
							{ from: translated.length, to: texts.length - 1 },
							undefined,
						);
					});
			})
			.catch((e) => {
				if (abortController.signal.aborted) return;
				setAllError(convertGenericError(e), texts.length);
			})
			.finally(() => endTracking());
	};

	const translateSingle = (index: number, text_: string) => {
		const modelId_ = modelId();
		if (modelId_ === undefined) {
			batch(() => {
				setError(index, noModelError());
				setTextResult(index, undefined);
			});
			return;
		}

		const endTracking = beginRequest(modelId_);
		batch(() => {
			setError(index, undefined);
			setTextResult(index, undefined);
		});

		const abortController = new AbortController();
		const request = window.rpc.unary(
			ctx(),
			{
				modelId: modelId_,
				promptId,
				srcLang: srcLang(),
				dstLang: dstLang(),
				cleanCache: true,
			},
			text_,
			abortController.signal,
		);
		onCleanup(() => abortController.abort());

		request
			.then((resp) => {
				const normalized = normalizeUnaryResponse<string | string[]>(resp);
				const value = Array.isArray(normalized.output)
					? normalized.output[0]
					: normalized.output;
				batch(() => {
					setError(index, undefined);
					setTextResult(index, value);
				});
			})
			.catch((e) => {
				if (abortController.signal.aborted) return;
				batch(() => {
					setError(index, convertGenericError(e));
					setTextResult(index, undefined);
				});
			})
			.finally(() => endTracking());
	};

	createEffect(() => {
		const text_ = text();
		translate(text_);
		onCleanup(clearAll);
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

	const ret = createMemo(() => {
		const len = text().length;
		return untrack(() =>
			Array.from({ length: len }, (_, i) => {
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
			}),
		);
	});

	return [ret, retry];
}

type ResultWithReasoning<T> = Result<T> & { reasoning?: string };
type SingleReturn<T> = readonly [ResultWithReasoning<T>, retry: () => void];
type SingleStreamReturn<T> = readonly [
	ResultWithReasoning<T> & { len: number; streaming: boolean },
	retry: () => void,
];

export function createTranslation<T = string>(
	text: () => string,
	options?: {
		stream: true;
		promptId?: string;
		modelId?: () => string | undefined;
		srcLang?: () => string | undefined;
		dstLang?: () => string | undefined;
		ctx?: () => TranslateContext;
	},
): SingleStreamReturn<T>;
export function createTranslation<T>(
	text: () => string,
	options?: {
		stream?: false;
		modelId?: () => string | undefined;
		srcLang?: () => string | undefined;
		dstLang?: () => string | undefined;
		promptId?: string;
		ctx?: () => TranslateContext;
	},
): SingleReturn<T>;
export function createTranslation<T>(
	text: () => string,
	options: {
		stream?: boolean;
		promptId?: string;
		modelId?: () => string | undefined;
		srcLang?: () => string | undefined;
		dstLang?: () => string | undefined;
		ctx?: () => TranslateContext;
	} = {
		stream: false,
	},
): SingleReturn<T> | SingleStreamReturn<T> {
	const [modelId, srcLang, dstLang] = useTranslationContext(
		options.modelId,
		options.srcLang,
		options.dstLang,
	);
	const promptId = options.promptId || PROMPT_ID.translate;
	const ctx = options.ctx || (() => ({ page: getPageContext() }));
	const { beginRequest } = useProgressIndicator();

	const [result, setResult] = createSignal<T>();
	const [error, setError] = createSignal<TranslateError>();
	const [reasoning, setReasoning] = createSignal<string>();

	const [len, setLen] = options.stream ? createSignal(0) : [() => 0, () => {}];
	const [streaming, setStreaming] = options.stream
		? createSignal(false)
		: [() => false, () => {}];

	const setLoading = () =>
		batch(() => {
			setError(undefined);
			setResult(undefined);
			setReasoning(undefined);
		});

	const setResultVal = (val: T, reasoning?: string) =>
		batch(() => {
			setError(undefined);
			setResult(() => val);
			setReasoning(reasoning);
		});

	const setErrorVal = (e: TranslateError) =>
		batch(() => {
			setError(e);
			setResult(undefined);
			setReasoning(undefined);
		});

	const translateStream = async (text_: string, cleanCache?: boolean) => {
		const modelId_ = modelId();
		if (modelId_ === undefined) {
			setErrorVal(noModelError());
			return;
		}

		const endTracking = beginRequest(modelId_);
		setLoading();

		const abortController = new AbortController();
		const listener = window.rpc.stream(
			ctx(),
			{
				modelId: modelId_,
				promptId,
				srcLang: srcLang(),
				dstLang: dstLang(),
				cleanCache,
			},
			text_,
			abortController.signal,
		);
		onCleanup(() => abortController.abort());

		try {
			setLen(0);
			setStreaming(true);
			for await (const chunk of listener as AsyncGenerator<TranslationStreamChunk>) {
				batch(() => {
					setError(undefined);
					const content = chunk.content;
					const reasoning = chunk.reasoning;
					if (content) {
						// @ts-ignore stream request must return string chunks
						setResult((prev) => (prev || "") + content);
						setLen((prev: number) => prev + content.length);
					}
					if (reasoning) {
						setReasoning((prev) => (prev || "") + reasoning);
						setLen((prev: number) => prev + reasoning.length);
					}
				});
			}
		} catch (e) {
			if (abortController.signal.aborted) return;
			setErrorVal(convertGenericError(e));
		} finally {
			endTracking();
			setStreaming(false);
		}
	};

	const translateUnary = async (text_: string, cleanCache?: boolean) => {
		const modelId_ = modelId();
		if (modelId_ === undefined) {
			setErrorVal(noModelError());
			return;
		}

		const endTracking = beginRequest(modelId_);
		setLoading();

		const abortController = new AbortController();
		const request = window.rpc.unary(
			ctx(),
			{
				modelId: modelId_,
				promptId,
				srcLang: srcLang(),
				dstLang: dstLang(),
				cleanCache,
			},
			text_,
			abortController.signal,
		);
		onCleanup(() => abortController.abort());

		request
			.then((resp) => {
				const normalized = normalizeUnaryResponse<T>(resp);
				setResultVal(normalized.output, normalized.reasoning);
			})
			.catch((e) => {
				if (abortController.signal.aborted) return;
				setErrorVal(convertGenericError(e));
			})
			.finally(() => endTracking());
	};

	const doTranslate = (text_: string, cleanCache?: boolean) =>
		options.stream
			? translateStream(text_, cleanCache)
			: translateUnary(text_, cleanCache);

	createEffect(() => {
		const text_ = text();
		onCleanup(() =>
			batch(() => {
				setError(undefined);
				setResult(undefined);
				setReasoning(undefined);
			}),
		);
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
			get: error,
		},
		reasoning: {
			get: reasoning,
		},
		loading: {
			get: () => {
				// Access each signal explicitly to track reactivity
				const hasResult = result() !== undefined;
				const hasError = error() !== undefined;
				return !hasResult && !hasError;
			},
		},
		...(options.stream && {
			len: {
				get: len,
			},
			streaming: {
				get: streaming,
			},
		}),
	});

	return [read as ResultWithReasoning<T>, retry];
}
