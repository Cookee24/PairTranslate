import { batch, createEffect, createSignal, onCleanup } from "solid-js";
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
	retry: (index: number | undefined) => void,
];

const noModelError = () =>
	createTranslateError(
		TranslateErrorType.MODEL_NOT_FOUND,
		"In-text model not configured",
	);
const batchMismatchError = (exp: number, got: number) =>
	createTranslateError(
		TranslateErrorType.VALIDATION_ERROR,
		`Expected ${exp} translations, but got ${got}`,
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

	return [modelId, srcLang, dstLang] as const;
};

export function createBatchTranslation(
	text: () => string[],
	options: {
		promptId?: string;
		modelId?: () => string | undefined;
		thinCache?: boolean;
		ctx?: () => Record<string, unknown>;
	} = {},
): BatchReturn {
	const [modelId, srcLang, dstLang] = useTranslationContext(options.modelId);
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

	const translate = async (texts: string[], cleanCache = false) => {
		const modelId_ = modelId();
		if (modelId_ === undefined) {
			setAllError(noModelError(), texts.length);
			return;
		}

		const endTracking = beginRequest(modelId_);
		setAllLoading(texts.length);
		try {
			const resp = await window.rpc.unary(
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
			);
			setResultTexts(resp);
			resp.length < texts.length &&
				batch(() => {
					setError(
						{ from: resp.length, to: texts.length - 1 },
						batchMismatchError(resp.length, texts.length),
					);
					setTextResult({ from: resp.length, to: texts.length - 1 }, undefined);
				});
		} catch (e) {
			setAllError(convertGenericError(e), texts.length);
		} finally {
			endTracking();
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

		const endTracking = beginRequest(modelId_);
		batch(() => {
			setError(index, undefined);
			setTextResult(index, undefined);
		});

		try {
			const resp = await window.rpc.unary(
				ctx(),
				{
					modelId: modelId_,
					promptId,
					srcLang: srcLang(),
					dstLang: dstLang(),
					cleanCache: true,
				},
				text_,
			);
			batch(() => {
				setError(index, undefined);
				setTextResult(index, Array.isArray(resp) ? resp[0] : resp);
			});
		} catch (e) {
			batch(() => {
				setError(index, convertGenericError(e));
				setTextResult(index, undefined);
			});
		} finally {
			endTracking();
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

export function createTranslation<T = string>(
	text: () => string,
	options?: {
		stream: true;
		promptId?: string;
		modelId?: () => string | undefined;
		ctx?: () => TranslateContext;
	},
): SingleStreamReturn<T>;
export function createTranslation<T>(
	text: () => string,
	options?: {
		stream?: false;
		modelId?: () => string | undefined;
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
		ctx?: () => TranslateContext;
	} = {
		stream: false,
	},
): SingleReturn<T> | SingleStreamReturn<T> {
	const [modelId, srcLang, dstLang] = useTranslationContext(options.modelId);
	const promptId = options.promptId || PROMPT_ID.translate;
	const ctx = options.ctx || (() => ({ page: getPageContext() }));
	const { beginRequest } = useProgressIndicator();

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
			setError(e);
			setResult(undefined);
		});

	const translateStream = async (text_: string, cleanCache?: boolean) => {
		const modelId_ = modelId();
		if (modelId_ === undefined) {
			setErrorVal(noModelError());
			return;
		}

		const endTracking = beginRequest(modelId_);
		setLoading();

		try {
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
			);
			onCleanup(() => listener.return());
			setLen(0);
			for await (const chunk of listener) {
				batch(() => {
					setError(undefined);
					// @ts-ignore stream request must return string chunks
					setResult((prev) => (prev || "") + chunk);
					setLen((prev: number) => prev + chunk.length);
				});
			}
		} catch (e) {
			setErrorVal(convertGenericError(e));
		} finally {
			endTracking();
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
		try {
			const resp = await window.rpc.unary(
				ctx(),
				{
					modelId: modelId_,
					promptId,
					srcLang: srcLang(),
					dstLang: dstLang(),
					cleanCache,
				},
				text_,
			);
			setResultVal(resp);
		} catch (e) {
			setErrorVal(convertGenericError(e));
		} finally {
			endTracking();
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
