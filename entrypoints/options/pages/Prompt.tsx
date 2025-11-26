import { useNavigate, useParams } from "@solidjs/router";
import {
	ArrowLeft,
	BookMarked,
	BookText,
	Brain,
	CodeXml,
	Languages,
	ListPlus,
	Play,
	RotateCcw,
	ScrollText,
	Sparkles,
	Trash2,
	Variable,
	WandSparkles,
} from "lucide-solid";
import type { editor as MonacoEditorNS } from "monaco-editor-core";
import {
	createEffect,
	createMemo,
	createSignal,
	For,
	type JSX,
	onCleanup,
	Show,
	untrack,
} from "solid-js";
import { Alert } from "~/components/Alert";
import { Badge } from "~/components/Badge";
import { Button } from "~/components/Button";
import { Dropdown } from "~/components/Dropdown";
import { Loading } from "~/components/Loading";
import { Modal } from "~/components/Modal";
import { MonacoEditor } from "~/components/Monaco";
import { ScrollableReasoning } from "~/components/Reasoning";
import type { SelectOption } from "~/components/Select";
import { t } from "~/hooks/i18n";
import { useSettings } from "~/hooks/settings";
import { PROMPT_ID, SUPPORTED_LANGUAGES } from "~/utils/constants";
import { convertGenericError } from "~/utils/errors";
import { createLLMClient } from "~/utils/llm";
import { appendReasoningContent } from "~/utils/llm/reasoning";
import type { PromptStepOutput } from "~/utils/prompt/delimiter";
import type { CompiledStep, TranslatePayload } from "~/utils/prompt/engine";
import {
	buildStepPreview,
	compilePrompt,
	initializeConversation,
	normalizeLLMStepOutput,
	normalizePromptInput,
	normalizeStreamAggregate,
	snapshotConversation,
} from "~/utils/prompt/engine";
import {
	buildContextWithTranslateParams,
	TemplateParseError,
	templateToTokens,
	tokensToString,
} from "~/utils/prompt/parser";
import type { PromptSettings, ServiceSettings } from "~/utils/settings/def";
import { generatePromptSettings } from "~/utils/settings/default";
import type { TranslateContext } from "~/utils/types";

type StepExecutionState = {
	status: "idle" | "running" | "completed" | "error";
	input?: string;
	output?: unknown;
	error?: string;
	reasoning?: string;
};

type StepExecutionMap = Record<number, StepExecutionState>;

type CustomVariableEntry = { id: string; key: string; value: string };

type LLMService = Extract<ServiceSettings, { type: "llm" }>;

const TEMPLATE_SNIPPETS = [
	{
		titleKey: "promptStudio.templateSnippets.variables",
		snippet: `{{text}}\n{{page.title}}\n{{lang.src}}`,
	},
	{
		titleKey: "promptStudio.templateSnippets.conditionals",
		snippet: `{{#if lang.src}}...{{#elif lang.dst}}...{{#else}}...{{/if}}`,
	},
	{
		titleKey: "promptStudio.templateSnippets.loops",
		snippet: `{{#for key, item: object}}...{{/for}}`,
	},
	{
		titleKey: "promptStudio.templateSnippets.loopsWithoutKey",
		snippet: `{{#for item: text}}...{{/for}}`,
	},
	{
		titleKey: "promptStudio.templateSnippets.internalFunctions",
		snippet: `{{@toJSON var1}}  {{@toJSONPretty var2}}`,
	},
] as const;

const MONACO_MARKER_OWNER = "prompt-studio-editor";
const MONACO_ERROR_SEVERITY = 8; // Mirrors MarkerSeverity.Error without importing Monaco at runtime

const clampPosition = (source: string, position: number): number =>
	Math.min(source.length, Math.max(0, Math.floor(position)));

const getLineColumn = (source: string, position: number) => {
	let line = 1;
	let column = 1;
	for (let i = 0; i < position; i++) {
		if (source[i] === "\n") {
			line++;
			column = 1;
		} else {
			column++;
		}
	}
	return { line, column };
};

const createMarkerFromError = (
	source: string,
	error: TemplateParseError,
): MonacoEditorNS.IMarkerData => {
	if (typeof error.position === "number" && !Number.isNaN(error.position)) {
		const index = clampPosition(source, error.position);
		const { line, column } = getLineColumn(source, index);
		return {
			message: error.message,
			startLineNumber: line,
			startColumn: column,
			endLineNumber: line,
			endColumn: column + 1,
			severity: MONACO_ERROR_SEVERITY,
		};
	}
	return {
		message: error.message,
		startLineNumber: 1,
		startColumn: 1,
		endLineNumber: 1,
		endColumn: 2,
		severity: MONACO_ERROR_SEVERITY,
	};
};

const languageOptions: SelectOption[] = [
	{ value: "auto", label: "Auto" },
	...SUPPORTED_LANGUAGES.map((lang) => ({
		value: lang.code,
		label: `${lang.nativeName} (${lang.code})`,
	})),
];

const splitArrayInput = (value: string): string[] =>
	value
		.split(/\n{2,}/)
		.map((entry) => entry.trim())
		.filter(Boolean);

const safeDomain = (url: string): string | undefined => {
	try {
		if (!url) return undefined;
		return new URL(url).hostname;
	} catch {
		return undefined;
	}
};

const isStructuredOutput = (
	output: PromptStepOutput,
): output is Extract<PromptStepOutput, { type: "structured" }> =>
	typeof output === "object" &&
	output !== null &&
	"type" in output &&
	output.type === "structured";

const describeStepOutput = (output: PromptStepOutput | undefined): string => {
	if (!output || output === "string") return "String";
	if (
		typeof output === "object" &&
		"type" in output &&
		output.type === "stringArray"
	) {
		return "Array";
	}
	if (isStructuredOutput(output)) {
		return "JSON";
	}
	return "String";
};

type StepOutputFormState =
	| { type: "string" }
	| {
			type: "stringArray";
			delimiterMode: "text" | "regex";
			textDelimiter: string;
			regexPattern: string;
			regexFlags: string;
	  }
	| { type: "structured"; schemaText: string };

const createStepOutputDraft = (
	output: PromptStepOutput | undefined,
): StepOutputFormState => {
	if (!output || output === "string") {
		return { type: "string" };
	}
	if (
		typeof output === "object" &&
		output !== null &&
		"type" in output &&
		output.type === "stringArray"
	) {
		if (
			output.delimiter &&
			typeof output.delimiter === "object" &&
			"type" in output.delimiter &&
			output.delimiter.type === "regex"
		) {
			return {
				type: "stringArray",
				delimiterMode: "regex",
				textDelimiter: "\n",
				regexPattern: output.delimiter.pattern ?? "",
				regexFlags: output.delimiter.flags ?? "gm",
			};
		}
		return {
			type: "stringArray",
			delimiterMode: "text",
			textDelimiter:
				typeof output.delimiter === "string" && output.delimiter
					? output.delimiter
					: "\n",
			regexPattern: "",
			regexFlags: "gm",
		};
	}
	if (isStructuredOutput(output)) {
		let schemaText = "";
		if (output.schema !== undefined) {
			try {
				schemaText =
					typeof output.schema === "string"
						? output.schema
						: JSON.stringify(output.schema, null, 2);
			} catch {
				schemaText = "";
			}
		}
		return {
			type: "structured",
			schemaText,
		};
	}
	return { type: "string" };
};

const buildPromptOutputFromDraft = (
	draft: StepOutputFormState,
): PromptStepOutput => {
	if (draft.type === "string") {
		return "string";
	}
	if (draft.type === "stringArray") {
		if (draft.delimiterMode === "regex") {
			const pattern = draft.regexPattern.trim();
			if (!pattern) {
				throw new Error("invalidRegex");
			}
			return {
				type: "stringArray",
				delimiter: {
					type: "regex",
					pattern,
					flags: draft.regexFlags.trim() || "gm",
				},
			};
		}
		const delimiter = draft.textDelimiter;
		return {
			type: "stringArray",
			delimiter: delimiter ? delimiter : "\n",
		};
	}
	if (draft.type === "structured") {
		const schemaText = draft.schemaText.trim();
		if (!schemaText) {
			return {
				type: "structured",
				schema: {},
			};
		}
		try {
			return {
				type: "structured",
				schema: JSON.parse(schemaText),
			};
		} catch {
			throw new Error("invalidSchema");
		}
	}
	return "string";
};

const makeCustomVariableId = () => Math.random().toString(36).slice(2, 9);

const _resolveLanguageLabel = (code: string) => {
	if (code === "auto") return "Auto";
	const lang = SUPPORTED_LANGUAGES.find((entry) => entry.code === code);
	return lang ? lang.code : code;
};

const deriveStreamValue = (step: CompiledStep, aggregated: string): unknown => {
	if (isStructuredOutput(step.output)) {
		try {
			return JSON.parse(aggregated);
		} catch {
			return aggregated;
		}
	}
	return normalizeStreamAggregate(step, aggregated);
};

const clonePrompt = (prompt: PromptSettings): PromptSettings => ({
	...prompt,
	steps: prompt.steps.map((step) => ({ ...step })),
});

const PROMPT_ICON_MAP: Record<string, JSX.Element> = {
	[PROMPT_ID.translate]: <Languages size={16} />,
	[PROMPT_ID.batchTranslate]: <ScrollText size={16} />,
	[PROMPT_ID.inputTranslate]: <BookMarked size={16} />,
	[PROMPT_ID.dictionaryTranslate]: <BookText size={16} />,
	[PROMPT_ID.explain]: <Sparkles size={16} />,
};

const ensurePromptSnippet = (prompt: PromptSettings) => {
	const source =
		prompt.systemPrompt?.trim() || prompt.steps?.[0]?.message || "";
	return source.replace(/\s+/g, " ").trim().slice(0, 90);
};

const getPromptIcon = (id: string) =>
	PROMPT_ICON_MAP[id] ?? <Sparkles size={16} />;

const PromptPage = () => {
	const navigate = useNavigate();
	const params = useParams<{ promptId?: string }>();
	const { settings, setSettings } = useSettings();

	const promptEntries = createMemo(() => Object.entries(settings.prompts));
	const [selectedPromptId, setSelectedPromptId] = createSignal<string>();
	const [activeSection, setActiveSection] = createSignal<"system" | number>(
		"system",
	);

	createEffect(() => {
		const entries = promptEntries();
		if (entries.length === 0) return;
		const requested = params.promptId;
		if (requested && settings.prompts[requested]) {
			setSelectedPromptId(requested);
			return;
		}
		const current = selectedPromptId();
		if (!current || !settings.prompts[current]) {
			setSelectedPromptId(entries[0][0]);
			if (!params.promptId) {
				navigate(`/prompt/${entries[0][0]}`, { replace: true });
			}
		}
	});

	const handleSelectPrompt = (id: string) => {
		if (!settings.prompts[id]) return;
		setSelectedPromptId(id);
		if (params.promptId !== id) {
			navigate(`/prompt/${id}`);
		}
	};

	const selectedPrompt = createMemo(() => {
		const id = selectedPromptId();
		return id ? settings.prompts[id] : undefined;
	});

	const selectedPromptPreview = createMemo(() => {
		const prompt = selectedPrompt();
		const id = selectedPromptId();
		return {
			icon: id ? getPromptIcon(id) : <Sparkles size={16} />,
			name: prompt?.name ?? "Select prompt",
			snippet: prompt
				? ensurePromptSnippet(prompt)
				: "Pick a prompt to get started",
		};
	});

	const promptDropdownItems = createMemo(() =>
		promptEntries().map(([id, prompt]) => {
			const icon = getPromptIcon(id);
			return {
				id,
				icon,
				label: (
					<div class="space-y-0.5 text-left">
						<div class="flex items-center gap-2">
							{icon}
							<span class="font-semibold text-sm truncate">{prompt.name}</span>
						</div>
						<span class="text-[10px] text-base-content/60 block line-clamp-2">
							{ensurePromptSnippet(prompt)}
						</span>
					</div>
				),
				onClick: () => handleSelectPrompt(id),
			};
		}),
	);

	createEffect(() => {
		selectedPromptId();
		setActiveSection("system");
	});

	const serviceEntries = createMemo(() => Object.entries(settings.services));
	const llmServices = createMemo(
		() =>
			serviceEntries().filter(([, service]) => service.type === "llm") as Array<
				[string, LLMService]
			>,
	);
	const [selectedModelId, setSelectedModelId] = createSignal<
		string | undefined
	>();
	createEffect(() => {
		const entries = llmServices();
		if (entries.length === 0) {
			setSelectedModelId(undefined);
			return;
		}
		const current = selectedModelId();
		const stillValid = entries.some(([id]) => id === current);
		if (!stillValid) {
			setSelectedModelId(entries[0][0]);
		}
	});

	const [srcLang, setSrcLang] = createSignal(
		settings.translate.sourceLang || "auto",
	);
	const [dstLang, setDstLang] = createSignal(
		settings.translate.targetLang || "en",
	);
	const [sampleText, setSampleText] = createSignal(
		t("promptStudio.placeholders.sampleText"),
	);
	const [pageTitle, setPageTitle] = createSignal(
		t("promptStudio.placeholders.pageTitle"),
	);
	const [pageUrl, setPageUrl] = createSignal(
		t("promptStudio.placeholders.pageUrl"),
	);
	const [surrBefore, setSurrBefore] = createSignal(
		t("promptStudio.placeholders.surrBefore"),
	);
	const [surrAfter, setSurrAfter] = createSignal(
		t("promptStudio.placeholders.surrAfter"),
	);
	const [customVariables, setCustomVariables] = createSignal<
		CustomVariableEntry[]
	>([]);

	const previewContext = createMemo<TranslateContext & Record<string, unknown>>(
		() => {
			const domain = safeDomain(pageUrl());
			const ctx: TranslateContext & Record<string, unknown> = {};
			if (pageTitle().trim() || domain) {
				ctx.page = {
					title: pageTitle().trim() || "Untitled",
					domain: domain || pageTitle().trim() || "local",
					url: pageUrl().trim(),
				};
			}
			if (surrBefore().trim() || surrAfter().trim()) {
				ctx.surr = {
					...(surrBefore().trim() && { before: surrBefore().trim() }),
					...(surrAfter().trim() && { after: surrAfter().trim() }),
				};
			}
			customVariables()
				.map((entry) => [entry.key.trim(), entry.value] as const)
				.filter(([key]) => Boolean(key))
				.forEach(([key, value]) => {
					ctx[key] = value;
				});
			return ctx;
		},
	);

	const previewSteps = createMemo(() => {
		const prompt = selectedPrompt();
		const promptId = selectedPromptId();
		if (!prompt || !promptId) {
			return {
				error: t("promptStudio.selectPrompt"),
				steps: [],
				system: undefined,
			};
		}
		try {
			const compiled = compilePrompt(prompt);
			const expectsArray = prompt.input === "stringArray";
			const payload: TranslatePayload = expectsArray
				? splitArrayInput(sampleText())
				: sampleText();
			const normalizedPayload = normalizePromptInput(compiled, payload);
			const ctx = buildContextWithTranslateParams(
				previewContext(),
				{
					src: srcLang() === "auto" ? undefined : srcLang(),
					dst: dstLang() || "en",
				},
				normalizedPayload,
			);
			return {
				error: undefined,
				...buildStepPreview(compiled, ctx),
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : String(error),
				steps: [],
				system: undefined,
			};
		}
	});

	const currentEditorValue = createMemo(() => {
		const prompt = selectedPrompt();
		if (!prompt) return "";
		const section = activeSection();
		return untrack(() =>
			section === "system"
				? prompt.systemPrompt
				: (prompt.steps[section]?.message ?? ""),
		);
	});

	const updateEditorValue = (value: string) => {
		const promptId = selectedPromptId();
		if (!promptId) return;
		const section = activeSection();
		if (section === "system") {
			setSettings("prompts", promptId, "systemPrompt", value);
			return;
		}
		setSettings("prompts", promptId, "steps", section, "message", value);
	};

	const [editorMarkers, setEditorMarkers] = createSignal<
		MonacoEditorNS.IMarkerData[]
	>([]);
	const [editorError, setEditorError] = createSignal<string>();

	createEffect(() => {
		activeSection(); // ensure re-validation when switching tabs
		const source = currentEditorValue() ?? "";
		try {
			templateToTokens(source);
			setEditorMarkers([]);
			setEditorError(undefined);
		} catch (error) {
			if (error instanceof TemplateParseError) {
				setEditorMarkers([createMarkerFromError(source, error)]);
				setEditorError(error.message);
			} else {
				setEditorMarkers([]);
				setEditorError(undefined);
			}
		}
	});

	const [stepExecutions, setStepExecutions] = createSignal<StepExecutionMap>(
		{},
	);
	const updateStepExecution = (
		index: number,
		patch:
			| Partial<StepExecutionState>
			| ((prev?: StepExecutionState) => Partial<StepExecutionState>),
	) => {
		setStepExecutions((prev) => {
			const existing = prev[index];
			const resolved = typeof patch === "function" ? patch(existing) : patch;
			return {
				...prev,
				[index]: {
					...existing,
					...resolved,
				},
			};
		});
	};

	const [previewOutput, setPreviewOutput] = createSignal<unknown>();
	const [_previewReasoning, setPreviewReasoning] = createSignal<string>();
	const [previewError, setPreviewError] = createSignal<string>();
	const [previewLoading, setPreviewLoading] = createSignal(false);
	const [activePreviewTab, setActivePreviewTab] = createSignal<
		"output" | "trace"
	>("output");

	let previewRunId = 0;

	const getLLMService = (id: string | undefined): LLMService | undefined => {
		const service = id ? settings.services[id] : undefined;
		return service?.type === "llm" ? (service as LLMService) : undefined;
	};

	const promptLibraryDefaults = createMemo(() => generatePromptSettings());

	const handleRestorePrompt = () => {
		const promptId = selectedPromptId();
		if (!promptId) return;
		const fallback = promptLibraryDefaults()[promptId];
		if (fallback) {
			setSettings("prompts", promptId, clonePrompt(fallback));
		} else {
			const name = selectedPrompt()?.name ?? "Custom prompt";
			setSettings("prompts", promptId, {
				name,
				systemPrompt: "",
				input: "string",
				output: "string",
				steps: [
					{
						message: "",
						output: "string",
					},
				],
			});
		}
		setActiveSection("system");
	};

	const handleAddStep = () => {
		const promptId = selectedPromptId();
		const prompt = selectedPrompt();
		if (!promptId || !prompt) return;
		const nextIndex = prompt.steps.length;
		const updatedSteps = [
			...prompt.steps,
			{ message: "", output: "string" as const },
		];
		setSettings("prompts", promptId, "steps", updatedSteps);
		setActiveSection(nextIndex);
	};

	const handleRemoveStep = () => {
		const promptId = selectedPromptId();
		const prompt = selectedPrompt();
		const section = activeSection();
		if (
			!promptId ||
			!prompt ||
			typeof section !== "number" ||
			prompt.steps.length <= 1
		)
			return;
		const updatedSteps = prompt.steps.filter((_, index) => index !== section);
		setSettings("prompts", promptId, "steps", updatedSteps);
		const nextIndex = Math.max(0, Math.min(section, updatedSteps.length - 1));
		setActiveSection(nextIndex);
	};

	const handleStepOutputTypeChange = (type: StepOutputFormState["type"]) => {
		setStepOutputModalError(undefined);
		setStepOutputDraft((prev) => {
			if (prev.type === type) return prev;
			if (type === "string") return { type: "string" };
			if (type === "stringArray") {
				return {
					type: "stringArray",
					delimiterMode: "text",
					textDelimiter: "\n",
					regexPattern: "",
					regexFlags: "gm",
				};
			}
			return { type: "structured", schemaText: "" };
		});
	};

	const openStepOutputModal = () => {
		const section = activeSection();
		const prompt = selectedPrompt();
		if (!prompt || typeof section !== "number") return;
		const step = prompt.steps[section];
		if (!step) return;
		setStepOutputDraft(createStepOutputDraft(step.output));
		setStepOutputSection(section);
		setStepOutputModalError(undefined);
		setStepOutputModalOpen(true);
	};

	const handleStepOutputSave = () => {
		const promptId = selectedPromptId();
		const section = stepOutputSection();
		if (
			!promptId ||
			section === undefined ||
			!selectedPrompt()?.steps[section]
		) {
			return;
		}
		setStepOutputModalError(undefined);
		try {
			const nextOutput = buildPromptOutputFromDraft(stepOutputDraft());
			setSettings("prompts", promptId, "steps", section, "output", nextOutput);
			closeStepOutputModal();
		} catch (error) {
			if (error instanceof Error) {
				if (error.message === "invalidSchema") {
					setStepOutputModalError(t("promptStudio.outputModal.invalidSchema"));
					return;
				}
				if (error.message === "invalidRegex") {
					setStepOutputModalError(t("promptStudio.outputModal.invalidRegex"));
					return;
				}
				setStepOutputModalError(error.message);
			} else {
				setStepOutputModalError(String(error));
			}
		}
	};

	const addCustomVariable = () => {
		setCustomVariables((prev) => [
			...prev,
			{ id: makeCustomVariableId(), key: "", value: "" },
		]);
	};

	const updateCustomVariable = (
		id: string,
		patch: Partial<CustomVariableEntry>,
	) => {
		setCustomVariables((prev) =>
			prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
		);
	};

	const removeCustomVariable = (id: string) => {
		setCustomVariables((prev) => prev.filter((entry) => entry.id !== id));
	};

	const [isWideLayout, setIsWideLayout] = createSignal(false);
	const [previewModalOpen, setPreviewModalOpen] = createSignal(false);
	const [stepOutputModalOpen, setStepOutputModalOpen] = createSignal(false);
	const [stepOutputDraft, setStepOutputDraft] =
		createSignal<StepOutputFormState>({ type: "string" });
	const [stepOutputModalError, setStepOutputModalError] = createSignal<
		string | undefined
	>();
	const [stepOutputSection, setStepOutputSection] = createSignal<
		number | undefined
	>();
	const closeStepOutputModal = () => {
		setStepOutputModalOpen(false);
		setStepOutputModalError(undefined);
		setStepOutputSection(undefined);
	};

	createEffect(() => {
		if (typeof window === "undefined") return;
		const media = window.matchMedia("(min-width: 1280px)");
		const updateMatch = () => {
			setIsWideLayout(media.matches);
			if (media.matches) {
				setPreviewModalOpen(false);
			}
		};
		updateMatch();
		media.addEventListener("change", updateMatch);
		onCleanup(() => media.removeEventListener("change", updateMatch));
	});

	createEffect(() => {
		if (!stepOutputModalOpen()) return;
		const lockedSection = stepOutputSection();
		const section = activeSection();
		if (
			lockedSection !== undefined &&
			(typeof section !== "number" || section !== lockedSection)
		) {
			closeStepOutputModal();
		}
	});

	const sendPreview = async () => {
		const runId = ++previewRunId;
		const prompt = selectedPrompt();
		const promptId = selectedPromptId();
		const service = getLLMService(selectedModelId());
		if (!prompt || !promptId) {
			setPreviewError(t("promptStudio.selectPrompt"));
			return;
		}
		if (!service) {
			setPreviewError(t("promptStudio.selectLLM"));
			return;
		}
		if (!service.model) {
			setPreviewError(t("promptStudio.modelMissing"));
			return;
		}

		try {
			setPreviewLoading(true);
			setPreviewError(undefined);
			setPreviewReasoning(undefined);
			setPreviewOutput(undefined);

			const compiled = compilePrompt(prompt);
			const expectsArray = prompt.input === "stringArray";
			const payload: TranslatePayload = expectsArray
				? splitArrayInput(sampleText())
				: sampleText();
			const normalizedPayload = normalizePromptInput(compiled, payload);
			const lang = {
				src: srcLang() === "auto" ? undefined : srcLang(),
				dst: dstLang() || "en",
			};
			const baseContext = buildContextWithTranslateParams(
				previewContext(),
				lang,
				normalizedPayload,
			);
			const outputs: unknown[] = [];
			baseContext.output = outputs;

			const conversation = initializeConversation(compiled, baseContext);
			const client = createLLMClient(service.apiSpec, {
				apiKey: service.apiKey,
				baseUrl: service.baseUrl,
			});

			const resetMap: StepExecutionMap = {};
			compiled.steps.forEach((_step, index) => {
				resetMap[index] = { status: "idle" };
			});
			setStepExecutions(resetMap);

			const snapshotPromptSteps = prompt.steps;
			let aggregatedReasoning: string | undefined;

			for (let index = 0; index < compiled.steps.length; index++) {
				if (runId !== previewRunId) return;
				const compiledStep = compiled.steps[index];
				const promptStep = snapshotPromptSteps[index];
				const message = tokensToString(baseContext, compiledStep.messageTokens);
				conversation.push({ role: "user", content: message });
				updateStepExecution(index, { status: "running", input: message });

				const schema = isStructuredOutput(promptStep.output)
					? promptStep.output.schema
					: undefined;

				const request = {
					model: service.model,
					messages: snapshotConversation(conversation),
					temperature: service.temperature,
					maxTokens: service.maxOutputTokens,
				};

				try {
					if (index < compiled.steps.length - 1) {
						const response = await client.chat(request, schema);
						if (runId !== previewRunId) return;
						aggregatedReasoning = appendReasoningContent(
							aggregatedReasoning,
							response.reasoning,
						);
						const normalized = normalizeLLMStepOutput(
							compiledStep,
							response.output,
						);
						outputs.push(normalized);
						conversation.push({
							role: "assistant",
							content:
								typeof normalized === "string"
									? normalized
									: JSON.stringify(normalized),
						});
						updateStepExecution(index, (prev) => ({
							status: "completed",
							output: normalized,
							reasoning: appendReasoningContent(
								prev?.reasoning,
								response.reasoning,
							),
						}));
						continue;
					}

					const stream = client.chatStream(
						{ ...request, stream: true },
						schema,
					);
					let aggregatedContent = "";
					while (true) {
						const next = await stream.next();
						if (runId !== previewRunId) {
							await stream.return?.({});
							return;
						}
						if (next.done) {
							aggregatedReasoning = appendReasoningContent(
								aggregatedReasoning,
								next.value.reasoning,
							);
							const finalValue = deriveStreamValue(
								compiledStep,
								aggregatedContent,
							);
							outputs.push(finalValue);
							conversation.push({
								role: "assistant",
								content:
									typeof finalValue === "string"
										? finalValue
										: JSON.stringify(finalValue, null, 2),
							});
							setPreviewOutput(finalValue);
							updateStepExecution(index, (prev) => ({
								status: "completed",
								output: finalValue,
								reasoning: appendReasoningContent(
									prev?.reasoning,
									next.value.reasoning,
								),
							}));
							break;
						}
						const chunk = next.value;
						if (chunk.content) {
							aggregatedContent += chunk.content;
							const partial = deriveStreamValue(
								compiledStep,
								aggregatedContent,
							);
							setPreviewOutput(partial);
							updateStepExecution(index, { output: partial });
						}
						if (chunk.reasoning) {
							setPreviewReasoning((prev) =>
								appendReasoningContent(prev, chunk.reasoning),
							);
							updateStepExecution(index, (prev) => ({
								reasoning: appendReasoningContent(
									prev?.reasoning,
									chunk.reasoning,
								),
							}));
						}
					}
				} catch (error) {
					const converted = convertGenericError(error);
					updateStepExecution(index, {
						status: "error",
						error: converted.message,
					});
					throw error;
				}
			}

			if (runId === previewRunId) {
				setPreviewReasoning(aggregatedReasoning);
			}
		} catch (error) {
			const converted = convertGenericError(error);
			if (runId === previewRunId) {
				setPreviewError(converted.message);
			}
		} finally {
			if (runId === previewRunId) {
				setPreviewLoading(false);
			}
		}
	};

	const llmServiceOptions = createMemo<SelectOption[]>(() =>
		llmServices().map(([id, service]) => ({
			value: id,
			label: service.name,
		})),
	);

	const _editorTitle = createMemo(() => {
		const section = activeSection();
		if (section === "system") return t("promptStudio.systemPrompt");
		return t("promptStudio.step", [`${section + 1}`]);
	});

	const editorOutputLabel = createMemo(() => {
		const section = activeSection();
		if (typeof section === "number") {
			return describeStepOutput(selectedPrompt()?.steps[section]?.output);
		}
		return undefined;
	});

	const canConfigureStepOutput = createMemo(() => {
		const section = activeSection();
		if (typeof section !== "number") return false;
		return Boolean(selectedPrompt()?.steps[section]);
	});

	const canRemoveStep = createMemo(() => {
		const prompt = selectedPrompt();
		return (
			typeof activeSection() === "number" && (prompt?.steps.length ?? 0) > 1
		);
	});

	const statusBadgeVariant: Record<
		StepExecutionState["status"],
		Parameters<typeof Badge>[0]["variant"]
	> = {
		idle: "ghost",
		running: "info",
		completed: "success",
		error: "error",
	};

	const PreviewPanels = () => {
		const sampleLabelText = t("promptStudio.placeholders.sampleTextLabel");
		const resolvedSampleLabel =
			sampleLabelText === "promptStudio.placeholders.sampleTextLabel"
				? t("promptStudio.placeholders.sampleText")
				: sampleLabelText;
		const tracePlaceholderText = t("promptStudio.tracePlaceholder");
		const resolvedTracePlaceholder =
			tracePlaceholderText === "promptStudio.tracePlaceholder"
				? t("promptStudio.previewPlaceholder")
				: tracePlaceholderText;

		return (
			<div class="flex h-full flex-col border-l border-base-200 bg-base-50">
				<div class="grid grid-cols-3 gap-2 border-b border-base-200 bg-base-100 p-3 text-xs">
					<select
						class="select select-sm select-bordered w-full"
						value={selectedModelId() ?? ""}
						onChange={(e) =>
							setSelectedModelId(e.currentTarget.value || undefined)
						}
					>
						<option value="">
							{t("promptStudio.placeholders.selectModel")}
						</option>
						<For each={llmServiceOptions()}>
							{(option) => <option value={option.value}>{option.label}</option>}
						</For>
					</select>
					<select
						class="select select-sm select-bordered w-full"
						value={srcLang()}
						onChange={(e) => setSrcLang(e.currentTarget.value)}
					>
						<For each={languageOptions}>
							{(option) => <option value={option.value}>{option.label}</option>}
						</For>
					</select>
					<select
						class="select select-sm select-bordered w-full"
						value={dstLang()}
						onChange={(e) => setDstLang(e.currentTarget.value)}
					>
						<For
							each={languageOptions.filter((option) => option.value !== "auto")}
						>
							{(option) => <option value={option.value}>{option.label}</option>}
						</For>
					</select>
				</div>

				<div class="flex flex-1 flex-col overflow-hidden">
					<div class="flex-1 space-y-4 overflow-y-auto p-4">
						<div class="form-control text-xs">
							<div class="label pb-1">
								<span class="label-text font-semibold uppercase text-base-content/60">
									{resolvedSampleLabel}
								</span>
							</div>
							<textarea
								class="textarea textarea-bordered h-28 w-full resize-none font-mono text-sm"
								value={sampleText()}
								onInput={(e) => setSampleText(e.currentTarget.value)}
								placeholder={t("promptStudio.placeholders.sampleText")}
							/>
						</div>

						<div class="collapse collapse-arrow rounded-box border border-base-300 bg-base-200">
							<input type="checkbox" />
							<div class="collapse-title flex items-center gap-2 text-sm font-semibold">
								<Variable size={16} />
								{t("promptStudio.contextVariables")}
							</div>
							<div class="collapse-content space-y-3 text-xs">
								<div class="grid grid-cols-2 gap-2">
									<div class="form-control">
										<label class="label-text text-[11px] mb-1">
											{t("promptStudio.pageTitle")}
										</label>
										<input
											class="input input-sm input-bordered"
											value={pageTitle()}
											onInput={(e) => setPageTitle(e.currentTarget.value)}
										/>
									</div>
									<div class="form-control">
										<label class="label-text text-[11px] mb-1">
											{t("promptStudio.pageUrl")}
										</label>
										<input
											class="input input-sm input-bordered"
											value={pageUrl()}
											onInput={(e) => setPageUrl(e.currentTarget.value)}
										/>
									</div>
									<div class="form-control">
										<label class="label-text text-[11px] mb-1">
											{t("promptStudio.surroundingBefore")}
										</label>
										<input
											class="input input-sm input-bordered"
											value={surrBefore()}
											onInput={(e) => setSurrBefore(e.currentTarget.value)}
										/>
									</div>
									<div class="form-control">
										<label class="label-text text-[11px] mb-1">
											{t("promptStudio.surroundingAfter")}
										</label>
										<input
											class="input input-sm input-bordered"
											value={surrAfter()}
											onInput={(e) => setSurrAfter(e.currentTarget.value)}
										/>
									</div>
								</div>

								<div class="border-t border-base-300 pt-3">
									<div class="mb-2 flex items-center justify-between">
										<span class="font-semibold">
											{t("promptStudio.customVariables")}
										</span>
										<Button
											variant="ghost"
											size="xs"
											class="gap-1"
											onClick={addCustomVariable}
										>
											<ListPlus size={12} /> {t("common.add")}
										</Button>
									</div>
									<div class="space-y-2">
										<For each={customVariables()}>
											{(entry) => (
												<div class="flex gap-1">
													<input
														class="input input-sm input-bordered flex-1"
														placeholder={t(
															"promptStudio.placeholders.keyPlaceholder",
														)}
														value={entry.key}
														onInput={(e) =>
															updateCustomVariable(entry.id, {
																key: e.currentTarget.value,
															})
														}
													/>
													<input
														class="input input-sm input-bordered flex-1"
														placeholder={t(
															"promptStudio.placeholders.valuePlaceholder",
														)}
														value={entry.value}
														onInput={(e) =>
															updateCustomVariable(entry.id, {
																value: e.currentTarget.value,
															})
														}
													/>
													<Button
														variant="ghost"
														size="xs"
														class="text-error"
														onClick={() => removeCustomVariable(entry.id)}
													>
														<Trash2 size={12} />
													</Button>
												</div>
											)}
										</For>
									</div>
								</div>
							</div>
						</div>

						<Button
							variant="primary"
							class="w-full gap-2"
							onClick={() => {
								setActivePreviewTab("output");
								sendPreview();
							}}
							disabled={previewLoading() || !selectedPrompt()}
						>
							{previewLoading() ? <Loading size="xs" /> : <Play size={14} />}
							{t("promptStudio.runPreview")}
						</Button>
					</div>

					<div class="flex h-1/2 flex-col border-t border-base-300 bg-base-100">
						<div class="tabs tabs-lifted w-full px-2 pt-2 text-xs">
							<Button
								variant="ghost"
								class={`tab ${activePreviewTab() === "output" ? "tab-active text-base-content" : ""}`}
								onClick={() => setActivePreviewTab("output")}
							>
								<CodeXml size={12} class="mr-2" />
								{t("promptStudio.result")}
							</Button>
							<Button
								variant="ghost"
								class={`tab ${activePreviewTab() === "trace" ? "tab-active text-base-content" : ""}`}
								onClick={() => setActivePreviewTab("trace")}
							>
								<Brain size={12} class="mr-2" />
								{t("promptStudio.trace")}
							</Button>
						</div>
						<div class="flex-1 overflow-hidden">
							<Show when={activePreviewTab() === "output"}>
								<div class="flex h-full flex-col">
									<Show when={previewError()}>
										<Alert variant="error" class="rounded-none py-2 text-xs">
											{previewError()}
										</Alert>
									</Show>
									<div class="mockup-code h-full flex-1 overflow-auto rounded-none bg-neutral text-neutral-content text-xs">
										<Show
											when={previewOutput() !== undefined}
											fallback={
												<pre>
													<code>{t("promptStudio.previewPlaceholder")}</code>
												</pre>
											}
										>
											<pre>
												<code>
													{typeof previewOutput() === "string"
														? (previewOutput() as string)
														: JSON.stringify(previewOutput(), null, 2)}
												</code>
											</pre>
										</Show>
									</div>
								</div>
							</Show>
							<Show when={activePreviewTab() === "trace"}>
								<div class="h-full overflow-y-auto p-4">
									<Show
										when={previewSteps().steps.length > 0}
										fallback={
											<p class="text-center text-xs text-base-content/60">
												{previewSteps().error ?? resolvedTracePlaceholder}
											</p>
										}
									>
										<div class="mb-4 rounded-box border border-base-200 bg-base-100 p-3 text-[11px]">
											<div class="flex items-center gap-2 text-xs font-semibold">
												<BookMarked size={12} />
												<span>{t("promptStudio.systemPromptLabel")}</span>
											</div>
											<pre class="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-base-200 p-2 font-mono">
												{previewSteps().system?.trim() ||
													t("promptStudio.empty")}
											</pre>
										</div>
										<ul class="timeline timeline-vertical timeline-compact timeline-snap-icon">
											<For each={previewSteps().steps}>
												{(step, i) => {
													const st = stepExecutions()[step.index] ?? {
														status: "idle" as StepExecutionState["status"],
													};
													const icon =
														st.status === "completed" ? (
															<Badge variant="success" size="xs">
																✓
															</Badge>
														) : st.status === "error" ? (
															<Badge variant="error" size="xs">
																!
															</Badge>
														) : (
															<Badge variant="info" size="xs">
																··
															</Badge>
														);
													return (
														<li>
															<Show when={i() !== 0}>
																<hr
																	class={
																		st.status === "error"
																			? "bg-error"
																			: st.status === "completed"
																				? "bg-success"
																				: "bg-base-300"
																	}
																/>
															</Show>
															<div class="timeline-middle">{icon}</div>
															<div class="timeline-end mb-6 w-full">
																<div class="flex items-center justify-between text-xs">
																	<span class="font-semibold">
																		{step.label}
																	</span>
																	<Badge
																		variant={statusBadgeVariant[st.status]}
																		size="xs"
																	>
																		{st.status}
																	</Badge>
																</div>
																<div class="mt-2 rounded-box border border-base-200 bg-base-100 p-2 text-[11px] font-mono">
																	<span class="uppercase text-[9px] opacity-60">
																		{t("promptStudio.in")}
																	</span>
																	<pre class="max-h-24 overflow-auto">
																		{step.message}
																	</pre>
																	<Show when={st.output}>
																		<span class="mt-2 block uppercase text-[9px] opacity-60">
																			{t("promptStudio.out")}
																		</span>
																		<pre class="max-h-32 overflow-auto">
																			{typeof st.output === "string"
																				? (st.output as string)
																				: JSON.stringify(st.output, null, 2)}
																		</pre>
																	</Show>
																	<Show when={st.reasoning}>
																		<div class="mt-2 rounded border border-base-200 bg-base-50 p-2">
																			<ScrollableReasoning
																				text={st.reasoning || ""}
																			/>
																		</div>
																	</Show>
																	<Show when={st.error}>
																		<Alert
																			variant="error"
																			class="mt-2 py-1 text-[11px]"
																		>
																			{st.error}
																		</Alert>
																	</Show>
																</div>
															</div>
														</li>
													);
												}}
											</For>
										</ul>
									</Show>
								</div>
							</Show>
						</div>
					</div>
				</div>
			</div>
		);
	};

	const promptPreview = selectedPromptPreview();

	return (
		<div class="h-screen w-full flex flex-col overflow-hidden bg-base-100">
			{/* Compact Header */}
			<header class="shrink-0 h-12 px-4 flex items-center justify-between border-b border-base-200 bg-base-100 z-10">
				<div class="flex items-center gap-3">
					<Button
						variant="ghost"
						size="sm"
						class="btn-square"
						onClick={() => navigate("/settings")}
					>
						<ArrowLeft size={16} />
					</Button>
					<div class="flex items-center gap-2 font-semibold text-sm">
						<Sparkles size={16} class="text-primary" />
						<span>{t("promptStudio.title")}</span>
					</div>
				</div>
				<Show when={!isWideLayout()}>
					<Button
						size="sm"
						variant="primary"
						onClick={() => setPreviewModalOpen(true)}
					>
						<Play size={14} /> {t("promptStudio.preview")}
					</Button>
				</Show>
			</header>

			{/* Main Split Layout */}
			<div class="flex-1 flex w-full max-w-7xl mx-auto overflow-hidden">
				<div
					class={`flex h-full flex-col border-r border-base-300 bg-base-100 ${isWideLayout() ? "w-3/5" : "w-full"}`}
				>
					<div class="flex items-center justify-between border-b border-base-200 px-4 py-3">
						<div>
							<div class="flex items-center gap-2 text-sm font-semibold">
								{promptPreview.icon}
								<span>{promptPreview.name}</span>
								<Badge size="xs" variant="ghost">
									IDE
								</Badge>
							</div>
							<p class="text-xs text-base-content/50 line-clamp-1">
								{promptPreview.snippet}
							</p>
						</div>
						<div class="flex items-center gap-2">
							<div class="dropdown dropdown-end">
								<label class="btn btn-ghost btn-xs gap-1">
									<WandSparkles size={12} />
									{t("promptStudio.templates")}
								</label>
								<div class="dropdown-content card card-compact w-72 gap-2 border border-base-200 bg-base-100 p-2 text-xs shadow">
									<For each={TEMPLATE_SNIPPETS}>
										{(snippet) => (
											<div>
												<p class="font-semibold text-base-content/70">
													{t(snippet.titleKey)}
												</p>
												<pre class="rounded bg-base-200 p-1 font-mono">
													{snippet.snippet}
												</pre>
											</div>
										)}
									</For>
								</div>
							</div>
							<div class="join">
								<Button
									variant="ghost"
									size="xs"
									class="join-item"
									onClick={handleAddStep}
									title={t("promptStudio.addStep")}
								>
									<ListPlus size={14} />
								</Button>
								<Button
									variant="ghost"
									size="xs"
									class="join-item"
									onClick={handleRemoveStep}
									title={t("promptStudio.deleteStep")}
									disabled={!canRemoveStep()}
								>
									<Trash2 size={14} />
								</Button>
								<Button
									variant="primary"
									size="xs"
									class="join-item gap-1"
									onClick={handleRestorePrompt}
									title={t("promptStudio.reset")}
								>
									<RotateCcw size={14} />
									{t("common.resetSection")}
								</Button>
							</div>
						</div>
					</div>

					<div class="flex items-center gap-3 border-b border-base-200 px-4 py-3">
						<Dropdown
							trigger={
								<div class="flex w-full items-center gap-2 text-left">
									<div class="flex items-center gap-2 font-semibold">
										{promptPreview.icon}
										<span>{promptPreview.name}</span>
									</div>
								</div>
							}
							items={promptDropdownItems()}
							triggerType="click"
							closeOnSelect
							align="start"
							position="bottom"
							triggerClass="btn btn-ghost btn-sm w-full justify-between"
							width="w-72"
						/>
						<input
							class="input input-bordered input-sm w-full"
							placeholder={t("promptStudio.promptName")}
							value={selectedPrompt()?.name ?? ""}
							onInput={(e) => {
								const id = selectedPromptId();
								if (!id) return;
								setSettings("prompts", id, "name", e.currentTarget.value);
							}}
						/>
					</div>

					<div class="flex items-center justify-between border-b border-base-200 px-4 py-2 text-xs">
						<div class="flex gap-2 overflow-x-auto">
							<Button
								variant={activeSection() === "system" ? "primary" : "ghost"}
								size="xs"
								onClick={() => setActiveSection("system")}
							>
								<BookMarked size={12} class="mr-1" />
								{t("promptStudio.systemPrompt")}
							</Button>
							<For each={selectedPrompt()?.steps}>
								{(_step, i) => (
									<Button
										variant={activeSection() === i() ? "secondary" : "ghost"}
										size="xs"
										onClick={() => setActiveSection(i())}
									>
										<CodeXml size={12} class="mr-1" />
										{i() + 1}
									</Button>
								)}
							</For>
						</div>
						<Show when={canConfigureStepOutput()}>
							<Button
								variant="ghost"
								size="xs"
								class="gap-2 whitespace-nowrap"
								onClick={openStepOutputModal}
							>
								<Variable size={12} />
								<span>{t("promptStudio.stepOutput")}</span>
								<Badge size="xs" variant="ghost">
									{editorOutputLabel() || t("promptStudio.stepOutput")}
								</Badge>
							</Button>
						</Show>
					</div>

					<div class="relative flex-1 overflow-hidden bg-base-100 group">
						<Show when={editorError()}>
							<Alert variant="error" class="absolute left-4 top-4 z-10 text-xs">
								{editorError()}
							</Alert>
						</Show>
						<MonacoEditor
							value={currentEditorValue()}
							onChange={updateEditorValue}
							class="h-full"
							options={{
								fontSize: 13,
								minimap: { enabled: false },
								lineNumbersMinChars: 3,
								scrollBeyondLastLine: false,
							}}
							markers={editorMarkers()}
							markerOwner={MONACO_MARKER_OWNER}
						/>
						<div class="absolute bottom-4 right-4 opacity-0 transition-opacity group-hover:opacity-100">
							<Button variant="ghost" size="xs" class="gap-1">
								<Variable size={12} />
								{t("promptStudio.insertVariable")}
							</Button>
						</div>
					</div>
				</div>

				<Show when={isWideLayout()}>
					<div class="w-2/5 bg-base-50">
						<PreviewPanels />
					</div>
				</Show>
			</div>

			<Modal
				open={stepOutputModalOpen()}
				onClose={closeStepOutputModal}
				title={t("promptStudio.outputModal.title")}
				boxClass="w-full max-w-lg p-0 overflow-hidden rounded-t-xl sm:rounded-xl"
				actions={
					<>
						<Button
							variant="ghost"
							onClick={closeStepOutputModal}
						>
							{t("common.cancel")}
						</Button>
						<Button
							variant="primary"
							onClick={handleStepOutputSave}
						>
							{t("common.save")}
						</Button>
					</>
				}
			>
				<div class="space-y-4 px-6 pb-6 text-sm">
					<div class="form-control">
						<label class="label-text mb-1 text-xs font-semibold">
							{t("promptStudio.outputModal.typeLabel")}
						</label>
						<select
							class="select select-bordered select-sm w-full"
							value={stepOutputDraft().type}
							onChange={(e) =>
								handleStepOutputTypeChange(
									e.currentTarget.value as StepOutputFormState["type"],
								)
							}
						>
							<option value="string">
								{t("promptStudio.outputModal.string")}
							</option>
							<option value="stringArray">
								{t("promptStudio.outputModal.stringArray")}
							</option>
							<option value="structured">
								{t("promptStudio.outputModal.structured")}
							</option>
						</select>
					</div>

					<Show when={stepOutputModalError()}>
						<Alert variant="error" class="py-2 text-xs">
							{stepOutputModalError()}
						</Alert>
					</Show>

					<Show when={stepOutputDraft().type === "string"}>
						<p class="text-xs text-base-content/70">
							{t("promptStudio.outputModal.stringDescription")}
						</p>
					</Show>

					<Show when={stepOutputDraft().type === "stringArray"}>
						<div class="space-y-3 text-xs">
							<p class="text-base-content/70">
								{t("promptStudio.outputModal.stringArrayDescription")}
							</p>

							<Show
								when={(() => {
									const draft = stepOutputDraft();
									return (
										draft.type === "stringArray" &&
										draft.delimiterMode === "text"
									);
								})()}
							>
								<div class="form-control">
									<label class="label-text mb-1">
										{t("promptStudio.outputModal.delimiterLabel")}
									</label>
									<textarea
										class="textarea textarea-bordered h-20 w-full resize-none"
										value={(() => {
											const draft = stepOutputDraft();
											return draft.type === "stringArray"
												? draft.textDelimiter
												: "";
										})()}
										onInput={(e) => {
											setStepOutputModalError(undefined);
											setStepOutputDraft((prev) =>
												prev.type === "stringArray"
													? { ...prev, textDelimiter: e.currentTarget.value }
													: prev,
											);
										}}
										placeholder={t(
											"promptStudio.outputModal.delimiterPlaceholder",
										)}
									/>
								</div>
							</Show>

							<label class="label cursor-pointer justify-start gap-3">
								<input
									type="checkbox"
									class="toggle toggle-sm"
									checked={(() => {
										const draft = stepOutputDraft();
										return (
											draft.type === "stringArray" &&
											draft.delimiterMode === "regex"
										);
									})()}
									onChange={(e) => {
										setStepOutputModalError(undefined);
										setStepOutputDraft((prev) => {
											if (prev.type !== "stringArray") return prev;
											return {
												...prev,
												delimiterMode: e.currentTarget.checked
													? "regex"
													: "text",
											};
										});
									}}
								/>
								<span class="label-text text-xs">
									{t("promptStudio.outputModal.regexToggle")}
								</span>
							</label>

							<Show
								when={(() => {
									const draft = stepOutputDraft();
									return (
										draft.type === "stringArray" &&
										draft.delimiterMode === "regex"
									);
								})()}
							>
								<div class="grid gap-3 sm:grid-cols-2">
									<div class="form-control">
										<label class="label-text mb-1">
											{t("promptStudio.outputModal.regexPattern")}
										</label>
										<input
											class="input input-sm input-bordered"
											value={(() => {
												const draft = stepOutputDraft();
												return draft.type === "stringArray"
													? draft.regexPattern
													: "";
											})()}
											onInput={(e) => {
												setStepOutputModalError(undefined);
												setStepOutputDraft((prev) =>
													prev.type === "stringArray"
														? { ...prev, regexPattern: e.currentTarget.value }
														: prev,
												);
											}}
										/>
									</div>
									<div class="form-control">
										<label class="label-text mb-1">
											{t("promptStudio.outputModal.regexFlags")}
										</label>
										<input
											class="input input-sm input-bordered"
											value={(() => {
												const draft = stepOutputDraft();
												return draft.type === "stringArray"
													? draft.regexFlags
													: "";
											})()}
											onInput={(e) => {
												setStepOutputModalError(undefined);
												setStepOutputDraft((prev) =>
													prev.type === "stringArray"
														? { ...prev, regexFlags: e.currentTarget.value }
														: prev,
												);
											}}
										/>
									</div>
								</div>
							</Show>
						</div>
					</Show>

					<Show when={stepOutputDraft().type === "structured"}>
						<div class="space-y-3 text-xs">
							<p class="text-base-content/70">
								{t("promptStudio.outputModal.structuredDescription")}
							</p>
							<div class="form-control">
								<label class="label-text mb-1">
									{t("promptStudio.outputModal.schemaLabel")}
								</label>
								<textarea
									class="textarea textarea-bordered h-48 w-full font-mono text-xs"
									value={(() => {
										const draft = stepOutputDraft();
										return draft.type === "structured" ? draft.schemaText : "";
									})()}
									onInput={(e) => {
										setStepOutputModalError(undefined);
										setStepOutputDraft((prev) =>
											prev.type === "structured"
												? { ...prev, schemaText: e.currentTarget.value }
												: prev,
										);
									}}
									placeholder={t("promptStudio.outputModal.schemaPlaceholder")}
								/>
							</div>
						</div>
					</Show>
				</div>
			</Modal>

			{/* Mobile Modal Preview */}
			<Modal
				open={previewModalOpen()}
				onClose={() => setPreviewModalOpen(false)}
				boxClass="w-full h-[80vh] max-w-lg p-0 overflow-hidden rounded-t-xl sm:rounded-xl"
			>
				<div class="h-full p-2 bg-base-100">
					<div class="flex justify-between items-center mb-2 px-2">
						<h3 class="font-bold">{t("promptStudio.preview")}</h3>
					</div>
					<div class="h-[calc(100%-40px)]">
						<PreviewPanels />
					</div>
				</div>
			</Modal>
		</div>
	);
};

export default PromptPage;
