import { trackStore } from "@solid-primitives/deep";
import {
	Brain,
	Clock3,
	Copy,
	FileText,
	History,
	Languages,
	LayoutPanelLeft,
	Sparkles,
	TextCursorInput,
} from "lucide-solid";
import {
	createEffect,
	createMemo,
	createSignal,
	For,
	type JSX,
	onMount,
	Show,
} from "solid-js";
import { unwrap } from "solid-js/store";
import { Button } from "~/components/Button";
import { Loading } from "~/components/Loading";
import { MdStyled } from "~/components/MD";
import { ScrollableReasoning } from "~/components/Reasoning";
import { Select, type SelectOption } from "~/components/Select";
import { SettingsRecoveryBanner } from "~/components/SettingsRecoveryBanner";
import { SettingsProvider, useSettings } from "~/hooks/settings";
import { createTheme } from "~/hooks/theme";
import { createTranslation } from "~/hooks/translation";
import {
	getNativeName,
	PROMPT_ID,
	SUPPORTED_LANGUAGES,
} from "~/utils/constants";
import { t } from "~/utils/i18n";
import { isApple } from "~/utils/isapple";
import { selectServicesByType } from "~/utils/settings/services";
import {
	addSidebarHistoryEntry,
	clearSidebarHistory,
	loadSidebarHistory,
	loadSidebarSettings,
	type SidebarHistoryItem,
	saveSidebarSettings,
} from "~/utils/sidebar-storage";
import { getThemeClass } from "~/utils/theme";

const FullScreenLoading = () => (
	<div class="w-full h-full flex items-center justify-center">
		<Loading size="xl" />
	</div>
);

const SidebarContent = () => {
	const settingsCtx = useSettings();
	const theme = createTheme();
	const isAppleDevice = isApple();
	const submitShortcutKeys = isAppleDevice ? ["⌘", "⏎"] : ["Ctrl", "⏎"];

	createEffect(() => {
		document.documentElement.setAttribute(
			"data-theme",
			getThemeClass(theme()) || "",
		);
	});

	const [inputText, setInputText] = createSignal("");
	navigator.clipboard?.readText().then((clipText) => {
		if (inputText().trim().length === 0 && clipText.trim().length > 0) {
			setInputText(clipText);
		}
	});

	const [submittedText, setSubmittedText] = createSignal("");
	const [error, setError] = createSignal<string>();
	const initialTargetLang = settingsCtx.settings.translate?.targetLang ?? "en";
	const [history, setHistory] = createSignal<SidebarHistoryItem[]>([]);
	const [selectedModelId, setSelectedModelId] = createSignal<string>();
	const [targetLang, setTargetLang] = createSignal(initialTargetLang);
	const [lastHistoryKey, setLastHistoryKey] = createSignal<string>();
	const [renderMarkdown, setRenderMarkdown] = createSignal(false);

	const modelOptions = createMemo<SelectOption[]>(() => {
		trackStore(settingsCtx.settings.services);
		const services = unwrap(settingsCtx.settings.services);
		const llmServices = selectServicesByType(services, "llm");
		const traditionalServices = selectServicesByType(services, "traditional");

		const options: SelectOption[] = [];
		Object.entries(llmServices).forEach(([uuid, service]) => {
			options.push({
				value: uuid,
				label: service.name,
			});
		});
		Object.entries(traditionalServices).forEach(([uuid, service]) => {
			options.push({
				value: uuid,
				label: service.name,
			});
		});

		return options;
	});

	const modelNameLookup = createMemo(() => {
		const map = new Map<string, string>();
		modelOptions().forEach((option) => {
			map.set(String(option.value), String(option.label));
		});
		return map;
	});

	const resolvedModelId = () =>
		selectedModelId() || settingsCtx.settings.translate.floatingTranslateModel;

	const [translateResult, retry] = createTranslation(submittedText, {
		stream: true,
		promptId: PROMPT_ID.translate,
		modelId: resolvedModelId,
		srcLang: () => settingsCtx.settings.translate?.sourceLang,
		dstLang: targetLang,
		ctx: () => ({}),
	});
	const translation = () => translateResult() || "";
	const reasoning = () => translateResult.reasoning;

	const languageLabel = createMemo(() => {
		const source = settingsCtx.settings.translate?.sourceLang ?? "auto";
		const target = targetLang();
		const sourceName = getNativeName(source);
		const targetName = getNativeName(target);
		return `${sourceName} -> ${targetName}`;
	});

	createEffect(() => {
		if (translateResult.error) {
			setError(translateResult.error.message);
		}
	});

	onMount(async () => {
		const storedSettings = await loadSidebarSettings();
		if (storedSettings.modelId) {
			setSelectedModelId(storedSettings.modelId);
		}
		if (storedSettings.targetLang) {
			setTargetLang(storedSettings.targetLang);
		}
		const storedHistory = await loadSidebarHistory();
		setHistory(storedHistory);
	});

	const persistModelId = async (value: string) => {
		const next = value || undefined;
		setSelectedModelId(next);
		await saveSidebarSettings({
			modelId: next,
			targetLang: targetLang(),
		});
	};

	const persistTargetLang = async (value: string) => {
		setTargetLang(value);
		await saveSidebarSettings({
			modelId: resolvedModelId(),
			targetLang: value,
		});
	};

	const handleTranslate = () => {
		const text = inputText().trim();
		if (text.length === 0) {
			setError(t("translatorWindow.errors.emptyInput"));
			return;
		}

		const modelId = resolvedModelId();
		if (!modelId) {
			setError(t("errors.translationModelRequired"));
			return;
		}

		setError(undefined);

		if (text === submittedText()) {
			// Same content: rerun and clear cache via retry
			retry();
		} else {
			setLastHistoryKey("");
			setSubmittedText(text);
		}
	};

	const loadHistoryItem = (item: SidebarHistoryItem) => {
		setInputText(item.text);
		setSubmittedText(item.text);
		setLastHistoryKey(
			`${item.text}|${item.modelId ?? ""}|${item.targetLang ?? targetLang()}`,
		);
		setError(undefined);
		if (item.modelId) {
			setSelectedModelId(item.modelId);
		}
		if (item.targetLang) {
			setTargetLang(item.targetLang);
		}
	};

	const clearHistoryState = async () => {
		await clearSidebarHistory();
		setHistory([]);
	};

	const modelPlaceholder = () =>
		modelOptions().length === 0
			? t("settings.translation.noModel")
			: t("translatorWindow.placeholders.model");

	createEffect(() => {
		const text = translation();
		if (!text) return;
		if (
			translateResult.loading ||
			translateResult.streaming ||
			translateResult.error
		)
			return;
		const submitted = submittedText();
		if (!submitted) return;
		const historyKey = `${submitted}|${resolvedModelId() || ""}|${targetLang()}`;
		if (lastHistoryKey() === historyKey) return;
		void (async () => {
			const updatedHistory = await addSidebarHistoryEntry({
				text: submitted,
				translation: text,
				modelId: resolvedModelId(),
				targetLang: targetLang(),
			});
			setHistory(updatedHistory);
			setLastHistoryKey(historyKey);
		})();
	});

	const handleInputKeyDown: JSX.EventHandlerUnion<
		HTMLTextAreaElement,
		KeyboardEvent
	> = (event) => {
		const modifierPressed = isAppleDevice ? event.metaKey : event.ctrlKey;
		if (!modifierPressed) return;
		if (event.key !== "Enter") return;
		if (translateResult.streaming || inputText().trim().length === 0) return;
		event.preventDefault();
		handleTranslate();
	};

	return (
		<div class="min-h-screen bg-base-200">
			<div class="mx-auto flex max-w-5xl flex-col gap-4 p-4 pb-6">
				<SettingsRecoveryBanner />
				<header class="flex items-center justify-between gap-3 rounded-box bg-base-100/80 px-4 py-3">
					<div class="flex items-center gap-2 text-base-content">
						<LayoutPanelLeft size={18} />
						<div class="text-lg font-semibold">
							{t("translatorWindow.title.main")}
						</div>
					</div>
					<div class="flex items-center gap-2 text-xs uppercase tracking-wide text-base-content/70">
						<Sparkles size={14} />
						<span>{languageLabel()}</span>
					</div>
				</header>

				<div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
					<div class="flex flex-col gap-4">
						<div class="rounded-box bg-base-100 p-4">
							<div class="grid gap-3 sm:grid-cols-2">
								<div class="flex flex-col gap-1">
									<span class="text-xs font-semibold uppercase tracking-wide text-base-content/70">
										{t("common.selectModel")}
									</span>
									<Select
										class="w-full"
										options={modelOptions()}
										value={resolvedModelId() ?? ""}
										placeholder={modelPlaceholder()}
										onChange={(event) =>
											persistModelId(event.currentTarget.value)
										}
										size="sm"
									/>
								</div>
								<div class="flex flex-col gap-1">
									<span class="text-xs font-semibold uppercase tracking-wide text-base-content/70">
										{t("settings.translation.targetLanguage")}
									</span>
									<Select
										class="w-full"
										options={SUPPORTED_LANGUAGES.map((lang) => ({
											value: lang.code,
											label: lang.nativeName,
										}))}
										value={targetLang()}
										onChange={(event) =>
											persistTargetLang(event.currentTarget.value)
										}
										size="sm"
									/>
								</div>
							</div>
						</div>

						<div class="rounded-box bg-base-100 p-4">
							<div class="flex flex-col gap-2">
								<div class="flex items-center gap-2">
									<TextCursorInput size={12} />
									{t("translatorWindow.title.inputBox")}
								</div>
								<textarea
									class="textarea w-full rounded-box bg-base-100 text-base border-0 focus:outline-none"
									rows={6}
									value={inputText()}
									placeholder={t("translatorWindow.placeholders.input")}
									onInput={(event) => setInputText(event.currentTarget.value)}
									onKeyDown={handleInputKeyDown}
									autofocus
								/>
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2 text-xs uppercase tracking-wide text-base-content/70">
										<Clock3 size={14} />
										<span>{languageLabel()}</span>
									</div>
									<div class="flex items-center gap-3">
										<Button
											variant="primary"
											size="sm"
											on:click={handleTranslate}
											disabled={
												translateResult.streaming || inputText().length === 0
											}
										>
											{translateResult.streaming ? (
												<>
													<Loading size="xs" />
													{translateResult.len}
												</>
											) : (
												<>
													<Languages size={16} />
													{t("translatorWindow.actions.translate")}
												</>
											)}
											{submitShortcutKeys.map((key) => (
												<span class="kbd kbd-xs border-none">{key}</span>
											))}
										</Button>
									</div>
								</div>
								<Show when={error()}>
									<span class="text-error text-sm">{error()}</span>
								</Show>
							</div>
						</div>
					</div>

					<div class="rounded-box bg-base-100 p-4">
						<div class="flex items-center justify-between text-xs uppercase tracking-wide text-base-content/70 mb-2 gap-2">
							<div class="flex items-center gap-2">
								<Languages size={14} />
								{t("translatorWindow.actions.translate")}
							</div>
							<div class="flex items-center gap-2">
								<Button
									class="btn-circle tooltip tooltip-left"
									size="xs"
									variant={renderMarkdown() ? "primary" : "ghost"}
									on:click={() => setRenderMarkdown((prev) => !prev)}
									data-tip={t("translatorWindow.controls.toggleMarkdown")}
								>
									<FileText size={14} />
								</Button>
								<Button
									class="btn-circle tooltip tooltip-left"
									size="xs"
									variant="ghost"
									disabled={!translation()}
									on:click={() => {
										const text = translation();
										if (!text) return;
										navigator.clipboard?.writeText(text).catch(() => {
											setError(t("translatorWindow.messages.copyFailed"));
										});
									}}
									data-tip={t("translatorWindow.controls.copy")}
								>
									<Copy size={14} />
								</Button>
							</div>
						</div>
						<div class="bg-base-200 text-md rounded-box p-3 whitespace-pre-wrap max-h-96 overflow-auto">
							<Show
								when={renderMarkdown() && translation()}
								fallback={
									translation() ? (
										translation()
									) : (
										<span class="text-base-content/60">
											{t("translatorWindow.placeholders.result")}
										</span>
									)
								}
							>
								<MdStyled text={translation() || ""} />
							</Show>
						</div>
						<Show when={reasoning()}>
							{(text) => (
								<div class="rounded-box bg-base-100 p-3">
									<div class="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-base-content/70">
										<Brain size={12} />
										<span>{t("translatorWindow.thinking.title")}</span>
									</div>
									<ScrollableReasoning text={text()} />
								</div>
							)}
						</Show>
					</div>
				</div>

				<div class="rounded-box bg-base-100 p-4">
					<div class="flex items-center justify-between gap-3 mb-3">
						<div class="flex items-center gap-2">
							<History size={16} />
							<span class="text-base font-semibold">
								{t("translatorWindow.history.title")}
							</span>
						</div>
						<Button
							size="xs"
							variant="ghost"
							disabled={history().length === 0}
							on:click={clearHistoryState}
						>
							{t("translatorWindow.history.clear")}
						</Button>
					</div>

					<Show
						when={history().length > 0}
						fallback={
							<p class="text-sm text-base-content/60">
								{t("translatorWindow.history.empty")}
							</p>
						}
					>
						<div class="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
							<For each={history()}>
								{(item) => (
									<button
										type="button"
										class="w-full rounded-box bg-base-200/60 p-3 text-left transition hover:bg-primary/10"
										onClick={[loadHistoryItem, item]}
									>
										<div class="flex items-center justify-between text-xs uppercase tracking-wide text-base-content/70">
											<span>{new Date(item.createdAt).toLocaleString()}</span>
											<span class="badge badge-ghost badge-sm">
												{modelNameLookup().get(item.modelId ?? "") ||
													t("settings.translation.noModel")}
											</span>
										</div>
										<p class="mt-1 max-h-16 overflow-hidden text-sm font-medium text-base-content whitespace-pre-wrap">
											{item.text}
										</p>
										<p class="mt-1 max-h-16 overflow-hidden text-sm text-primary whitespace-pre-wrap">
											{item.translation}
										</p>
									</button>
								)}
							</For>
						</div>
					</Show>
				</div>
			</div>
		</div>
	);
};

const TranslatorApp = () => {
	const settingsCtx = useSettings();

	return (
		<Show when={!settingsCtx.loading()} fallback={<FullScreenLoading />}>
			<SidebarContent />
		</Show>
	);
};

export default () => {
	return (
		<SettingsProvider>
			<TranslatorApp />
		</SettingsProvider>
	);
};
