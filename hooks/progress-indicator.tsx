import type { Accessor, JSX } from "solid-js";
import {
	createContext,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	useContext,
} from "solid-js";
import type { TranslateQueueStatus } from "~/utils/types";
import { useSettings } from "./settings";

type ProgressIndicatorContextValue = {
	counter: Accessor<number>;
	modelId: Accessor<string | undefined>;
	status: Accessor<TranslateQueueStatus | undefined>;
	beginRequest(modelId: string): () => void;
	enabled: Accessor<boolean>;
};

const ProgressIndicatorContext = createContext<ProgressIndicatorContextValue>();

export function ProgressIndicatorProvider(props: { children: JSX.Element }) {
	const { settings } = useSettings();
	const [requests, setRequests] = createSignal<
		[key: symbol, modelId: string][]
	>([]);
	const [status, setStatus] = createSignal<TranslateQueueStatus>();
	const enabled = createMemo(() => settings.basic.progressIndicationEnabled);

	const beginRequest = (id: string) => {
		const key = Symbol();
		setRequests((prev) => [...prev, [key, id]]);
		return () => setRequests((prev) => prev.filter(([k]) => k !== key));
	};

	const activeModel = createMemo(() => {
		const reqs = requests();
		if (reqs.length === 0) return undefined;
		return reqs[reqs.length - 1][1];
	});

	createEffect(() => {
		const currentModel = activeModel();
		if (!currentModel) {
			setStatus(undefined);
			return;
		}

		setStatus(undefined);
		let cancelled = false;
		const subscription = window.rpc.queueStatus(currentModel);

		void (async () => {
			try {
				for await (const update of subscription) {
					if (cancelled) break;
					setStatus(update);
				}
			} catch (error) {
				console.debug("Queue status subscription stopped", error);
			}
		})();

		onCleanup(() => {
			cancelled = true;
			void subscription.return?.();
		});
	});

	const contextValue: ProgressIndicatorContextValue = {
		counter: () => requests().length,
		modelId: activeModel,
		status,
		beginRequest,
		enabled,
	};

	return (
		<ProgressIndicatorContext.Provider value={contextValue}>
			{props.children}
		</ProgressIndicatorContext.Provider>
	);
}

export function useProgressIndicator() {
	const context = useContext(ProgressIndicatorContext);
	if (!context) {
		throw new Error(
			"useProgressIndicator must be used within a ProgressIndicatorProvider",
		);
	}
	return context;
}

export function mightUseProgressIndicator() {
	return useContext(ProgressIndicatorContext);
}
