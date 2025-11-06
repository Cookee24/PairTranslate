import type { Accessor, JSX } from "solid-js";
import {
	createStore,
	reconcile,
	type SetStoreFunction,
	unwrap,
} from "solid-js/store";
import type * as s from "~/utils/settings/def";

interface SettingsContextType {
	settings: s.SettingsSchema;
	setSettings: SetStoreFunction<s.SettingsSchema>;
	loading: Accessor<boolean>;
	error: Accessor<string | null>;
}

const SettingsContext = createContext<SettingsContextType>();

export function SettingsProvider(props: { children: JSX.Element }) {
	const [settings, setSettings] = createStore<s.SettingsSchema>(
		generateDefaultSettings(),
	);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal<string | null>(null);
	const [setSettingsSignal, fireSetSettingsSignal] = createSignal(null, {
		equals: false,
	});

	createEffect(
		on(
			setSettingsSignal,
			async (_) => {
				setLoading(true);
				setError(null);

				saveSettings(unwrap(settings));
			},
			{ defer: true },
		),
	);

	onMount(() => {
		setLoading(true);
		setError(null);

		const unlisten = listenSettings((newSettings) => {
			setSettings(reconcile(newSettings));

			setTimeout(() => setLoading(false));
		});
		onCleanup(unlisten);
	});

	const contextValue: SettingsContextType = {
		settings,
		// biome-ignore lint/suspicious/noExplicitAny: anyscript
		setSettings: (...args: any[]) => {
			// @ts-expect-error: args type
			setSettings(...args);
			fireSetSettingsSignal(null);
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
