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
		// @ts-ignore This is usually fine, since children are only rendered after loaded
		{},
	);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal<string | null>(null);
	const [render, setRender] = createSignal(false);

	const performSaveSettings = async (newSettings: s.SettingsSchema) => {
		setLoading(true);
		setError(null);

		try {
			await saveSettings(newSettings);
		} catch (error) {
			setError((error as Error).message);
		} finally {
			setLoading(false);
		}
	};

	onMount(() => {
		const unlisten = listenSettings((newSettings) => {
			setSettings(reconcile(newSettings));

			setLoading(false);
			setRender(true);
		});
		onCleanup(unlisten);
	});

	const contextValue: SettingsContextType = {
		settings,
		// biome-ignore lint/suspicious/noExplicitAny: anyscript
		setSettings: (...args: any[]) => {
			// @ts-expect-error: args type
			setSettings(...args);
			performSaveSettings(unwrap(settings));
		},
		loading,
		error,
	};

	return (
		<SettingsContext.Provider value={contextValue}>
			<Show when={render()}>{props.children}</Show>
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
