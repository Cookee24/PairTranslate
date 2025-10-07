import type { Accessor, JSX } from "solid-js";
import {
	createStore,
	reconcile,
	type SetStoreFunction,
	unwrap,
} from "solid-js/store";
import type { z } from "zod";
import type { SettingsSchema } from "~/utils/settings";

// Generate a default state to prevent UI errors before the stream connects
const initialSettings = () => {
	const initial = generateDefaultSettings();
	initial.basic.enabled = false; // Start with the extension disabled
	return initial;
};
interface SettingsContextType {
	settings: z.infer<typeof SettingsSchema>;
	setSettings: SetStoreFunction<z.infer<typeof SettingsSchema>>;
	loading: Accessor<boolean>;
	error: Accessor<string | null>;
}

const SettingsContext = createContext<SettingsContextType>();

export function SettingsProvider(props: { children: JSX.Element }) {
	const [settings, setSettings] = createStore<z.infer<typeof SettingsSchema>>(
		initialSettings(),
	);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal<string | null>(null);
	const [setSettingsSignal, fireSetSettingsSignal] = createSignal(null, {
		equals: false,
	});

	// A single controller for the unified stream
	let streamController: AbortController | null = null;

	createEffect(
		on(setSettingsSignal, async () => {
			try {
				if (loading()) return;
				setError(null);
				setLoading(true);
				await window.rpc.setSettings(unwrap(settings));
			} catch (err) {
				console.error("Failed to set settings:", err);
				const errorMessage =
					err instanceof Error ? err.message : t("errors.settings.failedToSet");
				setError(errorMessage);
				throw err;
			}
		}),
	);

	onMount(async () => {
		streamController = new AbortController();
		try {
			setLoading(true);
			setError(null);

			const stream = window.rpc.streamSettings();

			for await (const newSettings of stream) {
				if (streamController.signal.aborted) break;
				// Use reconcile to efficiently update the store
				setSettings(reconcile(newSettings));
				setLoading(false);
			}
		} catch (err) {
			if (!streamController.signal.aborted) {
				console.error("Settings stream error:", err);
				const errorMessage =
					err instanceof Error
						? err.message
						: t("errors.settings.streamFailed");
				setError(errorMessage);
				setLoading(false);
			}
		}
	});

	onCleanup(() => {
		streamController?.abort();
	});

	const contextValue: SettingsContextType = {
		settings,
		// biome-ignore lint/suspicious/noExplicitAny: Lazy
		setSettings: (...args: any[]) => {
			fireSetSettingsSignal(null);
			// @ts-ignore
			return setSettings(...args);
		},
		loading,
		error,
	};

	return (
		<SettingsContext.Provider value={contextValue}>
			{props.children}
		</SettingsContext.Provider>
	);
}

// Hook to use the full settings context
export function useSettings() {
	const context = useContext(SettingsContext);
	if (!context) {
		throw new Error("useSettings must be used within a SettingsProvider");
	}
	return context;
}

// Hook for direct set settings functionality
export function useSetSettings() {
	const { setSettings } = useSettings();
	return setSettings;
}
