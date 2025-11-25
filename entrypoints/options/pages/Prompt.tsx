import { useNavigate, useParams } from "@solidjs/router";
import {
	ArrowLeft,
	ArrowRight,
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
import { Card } from "~/components/Card";
import { Dropdown } from "~/components/Dropdown";
import { Input } from "~/components/Input";
import { Loading } from "~/components/Loading";
import { Modal } from "~/components/Modal";
import { MonacoEditor } from "~/components/Monaco";
import { ScrollableReasoning } from "~/components/Reasoning";
import type { SelectOption } from "~/components/Select";
import { Select } from "~/components/Select";
import { useSettings } from "~/hooks/settings";
import { PROMPT_ID, SUPPORTED_LANGUAGES } from "~/utils/constants";
import { convertGenericError } from "~/utils/errors";
import { t } from "~/utils/i18n";
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

const makeCustomVariableId = () => Math.random().toString(36).slice(2, 9);

const resolveLanguageLabel = (code: string) => {
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
	const [expandedSteps, setExpandedSteps] = createSignal<
		Record<number, boolean>
	>({});
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

	const setAllExpanded = (indexes: number[]) => {
		setExpandedSteps(() => {
			const next: Record<number, boolean> = {};
			indexes.forEach((index) => {
				next[index] = true;
			});
			return next;
		});
	};

	const toggleStepExpansion = (index: number, isOpen: boolean) => {
		setExpandedSteps((prev) => ({
			...prev,
			[index]: isOpen,
		}));
	};

	const [previewOutput, setPreviewOutput] = createSignal<unknown>();
	const [previewReasoning, setPreviewReasoning] = createSignal<string>();
	const [previewError, setPreviewError] = createSignal<string>();
	const [previewLoading, setPreviewLoading] = createSignal(false);

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

	const contextVariableMappings = createMemo(() => {
		const mappings = [
			{
				label: t("promptStudio.contextLabels.text"),
				variable: "{{text}}",
				value: sampleText(),
			},
			{
				label: t("promptStudio.contextLabels.src"),
				variable: "{{lang.src}}",
				value: resolveLanguageLabel(srcLang()),
			},
			{
				label: t("promptStudio.contextLabels.dst"),
				variable: "{{lang.dst}}",
				value: resolveLanguageLabel(dstLang()),
			},
			{
				label: t("promptStudio.contextLabels.title"),
				variable: "{{page.title}}",
				value: pageTitle(),
			},
		];
		const customs = customVariables()
			.filter((entry) => entry.key.trim())
			.map((entry) => ({
				label: entry.key.trim(),
				variable: `{{${entry.key.trim()}}}`,
				value: entry.value,
			}));
		return [...mappings, ...customs];
	});

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
			setAllExpanded(compiled.steps.map((_, index) => index));

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

	const editorTitle = createMemo(() => {
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

	const STEP_STATUS_GRADIENT: Record<StepExecutionState["status"], string> = {
		idle: "border border-base-200 bg-base-100/60",
		running: "border border-info bg-linear-to-b from-info/30 to-transparent",
		completed:
			"border border-success bg-linear-to-b from-success/30 to-transparent",
		error: "border border-error bg-linear-to-b from-error/30 to-transparent",
	};

	const PreviewPanels = () => (
		<div class="flex flex-col h-full gap-2 overflow-hidden">
			{/* Settings & Inputs */}
			<Card.Root class="p-3 shrink-0">
				<div class="grid grid-cols-2 gap-2 mb-3">
					<Select
						value={selectedModelId() ?? ""}
						onInput={(e) => setSelectedModelId(e.currentTarget.value)}
						options={llmServiceOptions()}
						placeholder={t("promptStudio.placeholders.selectModel")}
						disabled={llmServices().length === 0}
						class="select-sm"
					/>
					<div class="flex gap-2">
						<Select
							value={srcLang()}
							onInput={(e) => setSrcLang(e.currentTarget.value)}
							options={languageOptions}
							class="select-sm flex-1"
						/>
						<ArrowRight size={12} class="mt-3 opacity-50" />
						<Select
							value={dstLang()}
							onInput={(e) => setDstLang(e.currentTarget.value)}
							options={languageOptions.filter((o) => o.value !== "auto")}
							class="select-sm flex-1"
						/>
					</div>
				</div>

				<div class="space-y-2">
					<textarea
						class="textarea textarea-bordered textarea-sm w-full h-16 leading-tight resize-none"
						placeholder={t("promptStudio.placeholders.sampleText")}
						value={sampleText()}
						onInput={(e) => setSampleText(e.currentTarget.value)}
					/>

					<details class="collapse collapse-arrow border border-base-200 bg-base-100 rounded-md">
						<summary class="collapse-title min-h-0 p-2 text-xs font-semibold bg-base-200/50 flex items-center gap-2">
							<Variable size={14} /> {t("promptStudio.contextVariables")}
						</summary>
						<div class="collapse-content p-3 space-y-3 text-xs">
							<div class="grid grid-cols-2 gap-2">
								<Input
									label={t("promptStudio.pageTitle")}
									class="input-xs"
									value={pageTitle()}
									onInput={(e) => setPageTitle(e.currentTarget.value)}
								/>
								<Input
									label={t("promptStudio.pageUrl")}
									class="input-xs"
									value={pageUrl()}
									onInput={(e) => setPageUrl(e.currentTarget.value)}
								/>
								<Input
									label={t("promptStudio.surroundingBefore")}
									class="input-xs"
									value={surrBefore()}
									onInput={(e) => setSurrBefore(e.currentTarget.value)}
								/>
								<Input
									label={t("promptStudio.surroundingAfter")}
									class="input-xs"
									value={surrAfter()}
									onInput={(e) => setSurrAfter(e.currentTarget.value)}
								/>
							</div>

							<div class="pt-2 border-t border-base-200">
								<div class="flex items-center justify-between mb-2">
									<span class="font-semibold">
										{t("promptStudio.customVariables")}
									</span>
									<Button size="xs" variant="ghost" onClick={addCustomVariable}>
										<ListPlus size={12} />
									</Button>
								</div>
								<div class="space-y-2">
									<For each={customVariables()}>
										{(entry) => (
											<div class="flex gap-1">
												<input
													class="input input-bordered input-xs flex-1"
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
													class="input input-bordered input-xs flex-1"
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
												<button
													type="button"
													class="btn btn-ghost btn-xs text-error px-1"
													onClick={() => removeCustomVariable(entry.id)}
												>
													<Trash2 size={12} />
												</button>
											</div>
										)}
									</For>
								</div>
							</div>

							<div class="pt-2 border-t border-base-200">
								<span class="font-semibold mb-1 block">
									{t("promptStudio.resolvedMapping")}
								</span>
								<div class="grid grid-cols-2 gap-2">
									<For each={contextVariableMappings()}>
										{(m) => (
											<div class="rounded-md border border-base-200/80 bg-base-100/70 p-2">
												<span class="text-[10px] uppercase tracking-wide opacity-70">
													{m.variable}
												</span>
												<div
													class="text-sm font-semibold mt-1 wrap-break-word text-base-content"
													title={m.value}
												>
													{m.value || (
														<span class="opacity-60">
															{t("promptStudio.empty")}
														</span>
													)}
												</div>
											</div>
										)}
									</For>
								</div>
							</div>
						</div>
					</details>

					<Button
						class="w-full"
						size="sm"
						onClick={sendPreview}
						disabled={previewLoading() || !selectedPrompt()}
					>
						{previewLoading() ? <Loading size="xs" /> : <Play size={14} />}
						{t("promptStudio.runPreview")}
					</Button>
				</div>
			</Card.Root>

			{/* Results Area */}
			<div class="flex-1 overflow-y-auto min-h-0 space-y-2 p-1">
				<Show when={previewError()}>
					<Alert variant="error" class="text-xs p-2">
						{previewError()}
					</Alert>
				</Show>

				<Show when={!previewSteps().error && previewSteps().system}>
					<Card.Root class="bg-linear-to-b from-primary/10 to-transparent border border-primary/30 text-xs">
						<Card.Title class="mx-4 mt-2">
							<div class="flex items-center gap-2 text-[10px] uppercase text-primary/70 mb-1">
								<ScrollText size={12} />
								<span>{t("promptStudio.systemPromptLabel")}</span>
								<Badge size="xs" variant="ghost" class="ml-auto">
									{t("promptStudio.preview")}
								</Badge>
							</div>
						</Card.Title>
						<Card.Body>
							<pre class="text-xs whitespace-pre-wrap font-mono wrap-break-word max-h-32 overflow-auto">
								{previewSteps().system}
							</pre>
						</Card.Body>
					</Card.Root>
				</Show>

				<Show when={previewOutput() !== undefined}>
					<Card.Root class="bg-linear-to-b from-primary/10 to-base-100/70 p-3 border border-primary/30 shadow-inner">
						<div class="text-xs font-bold uppercase text-base-content/50 mb-1">
							{t("promptStudio.result")}
						</div>
						<pre class="text-xs whitespace-pre-wrap font-mono wrap-break-word">
							{typeof previewOutput() === "string"
								? (previewOutput() as string)
								: JSON.stringify(previewOutput(), null, 2)}
						</pre>
						<Show when={previewReasoning()}>
							<div class="mt-2 pt-2 border-t border-base-300/50">
								<div class="text-xs font-bold uppercase text-base-content/50 mb-1">
									{t("promptStudio.reasoning")}
								</div>
								<ScrollableReasoning text={previewReasoning() || ""} />
							</div>
						</Show>
					</Card.Root>
				</Show>

				{/* Step Trace */}
				<Show when={!previewSteps().error && previewSteps().steps.length > 0}>
					<div class="divider text-xs text-base-content/50 my-1">
						{t("promptStudio.trace")}
					</div>
					<For each={previewSteps().steps}>
						{(step) => {
							const exc = () =>
								stepExecutions()[step.index] ?? { status: "idle" };
							const statusClass =
								STEP_STATUS_GRADIENT[exc().status] ?? STEP_STATUS_GRADIENT.idle;
							const isExpanded = expandedSteps()[step.index] ?? true;
							return (
								<div
									class={`collapse collapse-arrow rounded-md ${statusClass}`}
								>
									<input
										type="checkbox"
										checked={isExpanded}
										onInput={(e) =>
											toggleStepExpansion(step.index, e.currentTarget.checked)
										}
									/>
									<div class="collapse-title p-2 min-h-0 flex items-center justify-between gap-2 text-xs">
										<span class="font-semibold">{step.label}</span>
										<Badge
											variant={statusBadgeVariant[exc().status]}
											size="sm"
											class="text-[10px] h-5 mr-8"
										>
											{exc().status}
										</Badge>
									</div>
									<div class="collapse-content p-2 text-xs space-y-2 border-t border-base-100">
										<div>
											<span class="uppercase text-[10px] opacity-50 block">
												{t("promptStudio.in")}
											</span>
											<pre class="bg-base-200 p-1 rounded opacity-80 overflow-auto max-h-20">
												{step.message}
											</pre>
										</div>
										<Show when={exc().output}>
											<div>
												<span class="uppercase text-[10px] opacity-50 block">
													{t("promptStudio.out")}
												</span>
												<pre class="bg-base-200 p-1 rounded opacity-80 overflow-auto max-h-20">
													{typeof exc().output === "string"
														? (exc().output as string)
														: JSON.stringify(exc().output)}
												</pre>
											</div>
										</Show>
										<Show when={exc().reasoning}>
											<div>
												<span class="flex items-center gap-1 uppercase text-[10px] opacity-50 mb-1">
													<Brain size={12} />
													{t("promptStudio.reasoning")}
												</span>
												<div class="rounded-box border border-base-200/70 bg-base-100/60 p-2">
													<ScrollableReasoning text={exc().reasoning || ""} />
												</div>
											</div>
										</Show>
									</div>
								</div>
							);
						}}
					</For>
				</Show>
			</div>
		</div>
	);

	const promptPreview = selectedPromptPreview();

	return (
		<div class="h-screen w-full flex flex-col overflow-hidden bg-base-100">
			{/* Compact Header */}
			<header class="shrink-0 h-12 px-4 flex items-center justify-between border-b border-base-200 bg-base-100 z-10">
				<div class="flex items-center gap-3">
					<button
						type="button"
						class="btn btn-ghost btn-sm btn-square"
						onClick={() => navigate("/settings")}
					>
						<ArrowLeft size={16} />
					</button>
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
				{/* Left Pane: Editor */}
				<div
					class={`flex flex-col gap-2 p-3 border-r border-base-200 overflow-hidden ${isWideLayout() ? "w-7/12" : "w-full"}`}
				>
					{/* Prompt Selector Row */}
					<div class="flex gap-2 shrink-0 flex-wrap">
						<div class="flex-1 min-w-0">
							<Dropdown
								trigger={
									<div class="flex flex-col items-start gap-0.5 text-left">
										<div class="flex items-center gap-2 text-sm font-semibold">
											{promptPreview.icon}
											<span class="truncate">{promptPreview.name}</span>
										</div>
										<span class="text-[10px] text-base-content/60 truncate w-full">
											{promptPreview.snippet}
										</span>
									</div>
								}
								items={promptDropdownItems()}
								triggerType="click"
								closeOnSelect
								align="start"
								position="bottom"
								triggerClass="btn btn-ghost btn-sm justify-between gap-2 normal-case w-full"
								width="w-64"
							/>
						</div>
						<input
							class="input input-bordered input-sm flex-1"
							placeholder={t("promptStudio.promptName")}
							value={selectedPrompt()?.name ?? ""}
							onInput={(e) => {
								const id = selectedPromptId();
								if (!id) return;
								setSettings("prompts", id, "name", e.currentTarget.value);
							}}
						/>
						<div class="join">
							<Button
								size="sm"
								variant="ghost"
								class="join-item"
								onClick={handleAddStep}
								title={t("promptStudio.addStep")}
							>
								<ListPlus size={16} />
							</Button>
							<Button
								size="sm"
								variant="ghost"
								class="join-item"
								onClick={handleRemoveStep}
								title={t("promptStudio.deleteStep")}
								disabled={!canRemoveStep()}
							>
								<Trash2 size={16} />
							</Button>
							<Button
								size="sm"
								variant="ghost"
								class="btn join-item"
								onClick={handleRestorePrompt}
								title={t("promptStudio.reset")}
							>
								<RotateCcw size={16} />
							</Button>
						</div>
					</div>

					{/* Tabs & Cheatsheet Toggle */}
					<div class="flex items-center justify-between shrink-0">
						<div class="tabs tabs-boxed tabs-sm bg-transparent p-0 gap-1">
							<Button
								variant={activeSection() === "system" ? "primary" : "ghost"}
								onClick={() => setActiveSection("system")}
							>
								<BookMarked size={14} class="mr-1.5" />{" "}
								{t("promptStudio.systemPrompt")}
							</Button>
							<For each={selectedPrompt()?.steps}>
								{(_s, i) => (
									<Button
										variant={activeSection() === i() ? "secondary" : "ghost"}
										onClick={() => setActiveSection(i())}
									>
										<CodeXml size={14} class="mr-1.5" /> {i() + 1}
									</Button>
								)}
							</For>
						</div>

						<div class="dropdown dropdown-end">
							<Button
								variant="ghost"
								size="xs"
								tabindex="0"
								class="gap-1 text-base-content/60"
							>
								<WandSparkles size={12} /> {t("promptStudio.templates")}
							</Button>
							<div
								tabindex="0"
								class="dropdown-content z-1 card card-compact w-72 p-2 shadow bg-base-100 border border-base-200 text-xs"
							>
								<For each={TEMPLATE_SNIPPETS}>
									{(snippet) => (
										<div class="mb-2 last:mb-0">
											<div class="font-bold opacity-70 mb-1">
												{t(snippet.titleKey)}
											</div>
											<pre class="bg-base-200 p-1 rounded">
												{snippet.snippet}
											</pre>
										</div>
									)}
								</For>
							</div>
						</div>
					</div>

					{/* Editor Area */}
					<div class="flex-1 relative border border-base-300 rounded-box overflow-hidden bg-base-100 flex flex-col max-h-[70vh]">
						<div class="h-8 shrink-0 bg-base-200/50 border-b border-base-200 flex items-center justify-between px-3">
							<span class="text-xs font-mono font-semibold opacity-70">
								{editorTitle()}
							</span>
							<Show when={editorOutputLabel()}>
								<Badge size="sm" variant="ghost" class="h-5 text-[10px]">
									{editorOutputLabel()}
								</Badge>
							</Show>
						</div>
						<Show when={editorError()}>
							<Alert variant="error" class="mx-3 mt-2 text-xs py-1 px-2">
								{editorError()}
							</Alert>
						</Show>
						<MonacoEditor
							value={currentEditorValue()}
							onChange={updateEditorValue}
							class="flex-1"
							options={{
								fontSize: 13,
								minimap: { enabled: false },
								lineNumbersMinChars: 3,
							}}
							markers={editorMarkers()}
							markerOwner={MONACO_MARKER_OWNER}
						/>
					</div>
				</div>

				{/* Right Pane: Preview (Visible on Desktop) */}
				<Show when={isWideLayout()}>
					<div class="w-5/12 bg-base-50/50">
						<PreviewPanels />
					</div>
				</Show>
			</div>

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
