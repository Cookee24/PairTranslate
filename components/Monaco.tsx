import * as Monaco from "monaco-editor-core";
// import editorWorker from "monaco-editor-core"
import { createEffect, onCleanup, onMount } from "solid-js";
import { useSettings } from "~/hooks/settings";

// Define the custom language outside the component to avoid re-registration
const registerLanguage = () => {
	const id = "prompt-template";
	if (Monaco.languages.getLanguages().some((l) => l.id === id)) return;

	Monaco.languages.register({ id });
	Monaco.languages.setMonarchTokensProvider(id, {
		tokenizer: {
			root: [
				[/\{\{[#/]?[^}]+\}\}/, "variable.predefined"],
				[/```[\s\S]*?```/, "string"],
			],
		},
	});

	// Define a theme that highlights these variables
	Monaco.editor.defineTheme("prompt-dark", {
		base: "vs-dark",
		inherit: true,
		rules: [
			{ token: "variable.predefined", foreground: "FFD700" }, // Gold for variables
		],
		colors: {},
	});

	Monaco.editor.defineTheme("prompt-light", {
		base: "vs",
		inherit: true,
		rules: [
			{ token: "variable.predefined", foreground: "0000FF" }, // Blue for variables
		],
		colors: {},
	});
};

interface MonacoEditorProps {
	value: string;
	language?: string;
	options?: Monaco.editor.IStandaloneEditorConstructionOptions;
	class?: string;
	markers?: Monaco.editor.IMarkerData[];
	markerOwner?: string;
	onChange?: (value: string) => void;
}

export const MonacoEditor = (props: MonacoEditorProps) => {
	let ref: HTMLDivElement | undefined;
	const { settings } = useSettings();

	onMount(() => {
		if (!ref) return;

		registerLanguage();

		const isDark =
			settings.basic.theme === "dark" ||
			(settings.basic.theme === "system" &&
				window.matchMedia("(prefers-color-scheme: dark)").matches);

		const editor = Monaco.editor.create(ref, {
			value: props.value,
			language: props.language || "prompt-template",
			theme: isDark ? "prompt-dark" : "prompt-light",
			automaticLayout: true,
			minimap: { enabled: false },
			scrollBeyondLastLine: false,
			wordWrap: "on",
			...props.options,
		});

		const disposable = editor.onDidChangeModelContent(() => {
			props.onChange?.(editor.getValue() ?? "");
		});

		createEffect(() => {
			if (!editor) return;
			const model = editor.getModel();
			if (!model) return;
			const owner = props.markerOwner ?? "prompt-template";
			Monaco.editor.setModelMarkers(model, owner, props.markers ?? []);
		});

		createEffect(() => {
			const nextValue = props.value ?? "";
			if (!editor) return;
			const currentValue = editor.getValue();
			if (currentValue === nextValue) return;
			const position = editor.getPosition();
			editor.setValue(nextValue);
			if (position) {
				editor.setPosition(position);
			}
		});

		onCleanup(() => {
			disposable.dispose();
			editor.dispose();
		});
	});

	return <div class={props.class} ref={ref} />;
};
