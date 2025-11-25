import {
	Box,
	Eye,
	EyeOff,
	Globe,
	KeyRound,
	Package,
	RefreshCcw,
	SquarePen,
	Thermometer,
} from "lucide-solid";
import { createEffect, createSignal, on, Show } from "solid-js";
import type z from "zod";
import { Button } from "~/components/Button";
import { Modal } from "~/components/Modal";
import { cn } from "~/utils/cn";
import { t } from "~/utils/i18n";
import { createLLMClient } from "~/utils/llm";
import {
	LLMServiceSettings,
	type QueueControlSettings,
} from "~/utils/settings/def";
import { LLMServiceTemplates } from "~/utils/settings/default";
import { QueueOverrideFields } from "../components/QueueOverrideFields";

type LLMService = z.infer<typeof LLMServiceSettings>;

interface LLMModalProps {
	modelInfo?: LLMService;
	onSave: (config: LLMService) => void;
	onClose: () => void;
	open?: boolean;
	queueDefaults: QueueControlSettings;
}

export default (props: LLMModalProps) => {
	const DEFAULT: LLMService = {
		type: "llm",
		name: "",
		baseUrl: "",
		apiSpec: "openai",
		apiKey: "",
		model: "",
	};
	const [formData, setFormData] = createSignal(props.modelInfo || DEFAULT);

	const [validationErrors, setValidationErrors] =
		createSignal<z.ZodError | null>(null);
	const [selectedTemplate, setSelectedTemplate] = createSignal<string>("");
	const [availableModels, setAvailableModels] = createSignal<string[]>([]);
	const [isLoadingModels, setIsLoadingModels] = createSignal<boolean>(false);
	const [modelFetchError, setModelFetchError] = createSignal<string | null>(
		null,
	);
	const [apiKeyVisible, setApiKeyVisible] = createSignal(false);

	createEffect(
		on(
			[() => props.modelInfo, () => props.open],
			([info, open]) => open && setFormData(info || DEFAULT),
		),
	);

	const handleTemplateChange = (templateName: string) => {
		setSelectedTemplate(templateName);
		const template = LLMServiceTemplates.find((t) => t.name === templateName);
		if (template && template.type === "llm") {
			setFormData({
				...formData(),
				type: "llm",
				name: template.name,
				baseUrl: template.baseUrl,
				apiSpec: template.apiSpec,
			});
			setApiKeyVisible(false);
		}
	};

	const handleFetchModels = async () => {
		const config = formData();
		if (!config.baseUrl) {
			setModelFetchError(t("errors.llm.baseUrlRequired"));
			return;
		}

		setIsLoadingModels(true);
		setModelFetchError(null);

		try {
			const clientConfig = {
				apiKey: config.apiKey,
				baseUrl: config.baseUrl,
			};

			// Create client based on API spec with proper type narrowing
			const client =
				config.apiSpec === "openai"
					? createLLMClient("openai", clientConfig)
					: config.apiSpec === "anthropic"
						? createLLMClient("anthropic", clientConfig)
						: createLLMClient("google", clientConfig);

			const models = await client.listModels();

			const modelIds = Array.isArray(models) ? models.map((m) => m.id) : [];
			setAvailableModels(modelIds);
		} catch (error) {
			setModelFetchError(
				error instanceof Error
					? error.message
					: t("errors.llm.fetchModelsFailed"),
			);
		} finally {
			setIsLoadingModels(false);
		}
	};

	const handleSave = (e: Event) => {
		e.preventDefault();
		const result = LLMServiceSettings.safeParse(formData());
		if (result.success) {
			props.onSave(result.data);
			props.onClose();
			setValidationErrors(null);
		} else {
			setValidationErrors(result.error);
		}
	};

	const getFieldError = (fieldPath: string[]) => {
		if (!validationErrors()) return null;
		return validationErrors()?.issues.find(
			(issue) =>
				issue.path.length === fieldPath.length &&
				issue.path.every((segment, index) => segment === fieldPath[index]),
		);
	};

	const renderError = (fieldPath: string[]) => {
		const error = getFieldError(fieldPath);
		return (
			error && (
				<div class="label py-1">
					<span class="label-text-alt text-xs text-error">{error.message}</span>
				</div>
			)
		);
	};

	return (
		<Modal
			open={props.open}
			onClose={props.onClose}
			title={
				props.modelInfo
					? t("settings.llmModal.editTitle")
					: t("settings.llmModal.addTitle")
			}
			backdrop
			actions={
				<>
					<Button variant="ghost" onClick={props.onClose}>
						{t("common.cancel")}
					</Button>
					<Button variant="primary" onClick={handleSave}>
						{t("common.save")}
					</Button>
				</>
			}
		>
			<div class="space-y-6">
				<div class="grid gap-4 md:grid-cols-2">
					<div class="form-control">
						<div class="label pb-1">
							<span class="label-text text-xs font-semibold uppercase text-base-content/60">
								{t("settings.llmModal.serviceTemplate")}
							</span>
						</div>
						<select
							class="select select-bordered w-full"
							value={selectedTemplate()}
							onChange={(e) => handleTemplateChange(e.target.value)}
						>
							<option value="">{t("settings.llmModal.customService")}</option>
							{LLMServiceTemplates.map((template) => (
								<option value={template.name}>{template.name}</option>
							))}
						</select>
					</div>

					<div class="form-control">
						<div class="label pb-1">
							<span class="label-text text-xs font-semibold uppercase text-base-content/60">
								{t("settings.llmModal.serviceName")}
							</span>
						</div>
						<label
							class={cn(
								"input input-bordered flex items-center gap-2",
								getFieldError(["name"]) && "input-error",
							)}
						>
							<SquarePen size={16} class="text-base-content/60" />
							<input
								type="text"
								class="grow bg-transparent"
								value={formData().name}
								onChange={(e) =>
									setFormData({ ...formData(), name: e.currentTarget.value })
								}
								placeholder={t("settings.llmModal.serviceNamePlaceholder")}
							/>
						</label>
						{renderError(["name"])}
					</div>
				</div>

				<div class="grid gap-4 md:grid-cols-2">
					<div class="form-control">
						<div class="label pb-1">
							<span class="label-text text-xs font-semibold uppercase text-base-content/60">
								{t("settings.llmModal.apiSpec")}
							</span>
						</div>
						<select
							class="select select-bordered w-full"
							value={formData().apiSpec}
							onChange={(e) =>
								setFormData({
									...formData(),
									apiSpec: e.currentTarget.value as
										| "openai"
										| "anthropic"
										| "google",
								})
							}
						>
							<option value="openai">
								{t("settings.llmModal.apiSpecs.openai")}
							</option>
							<option value="anthropic">
								{t("settings.llmModal.apiSpecs.anthropic")}
							</option>
							<option value="google">
								{t("settings.llmModal.apiSpecs.gemini")}
							</option>
						</select>
					</div>

					<div class="form-control">
						<div class="label pb-1">
							<span class="label-text text-xs font-semibold uppercase text-base-content/60">
								{t("settings.llmModal.baseUrl")}
							</span>
						</div>
						<label
							class={cn(
								"input input-bordered flex items-center gap-2",
								getFieldError(["baseUrl"]) && "input-error",
							)}
						>
							<Globe size={16} class="text-base-content/60" />
							<input
								type="url"
								class="grow bg-transparent"
								value={formData().baseUrl}
								onChange={(e) =>
									setFormData({ ...formData(), baseUrl: e.currentTarget.value })
								}
								placeholder={t("settings.llmModal.baseUrlPlaceholder")}
							/>
						</label>
						{renderError(["baseUrl"])}
					</div>
				</div>

				<div class="grid gap-4 md:grid-cols-2">
					<div class="form-control">
						<div class="label pb-1">
							<span class="label-text text-xs font-semibold uppercase text-base-content/60">
								{t("settings.llmModal.apiKey")}
							</span>
						</div>
						<label class="input input-bordered flex items-center gap-2">
							<KeyRound size={16} class="text-base-content/60" />
							<input
								type={apiKeyVisible() ? "text" : "password"}
								class="grow bg-transparent"
								value={formData().apiKey || ""}
								onChange={(e) =>
									setFormData({ ...formData(), apiKey: e.currentTarget.value })
								}
								placeholder={t("settings.llmModal.apiKeyPlaceholder")}
							/>
							<button
								type="button"
								class="btn btn-ghost btn-xs btn-circle"
								onClick={() => setApiKeyVisible((v) => !v)}
							>
								<Show
									when={apiKeyVisible()}
									fallback={<Eye size={14} class="text-base-content/60" />}
								>
									<EyeOff size={14} class="text-base-content/60" />
								</Show>
							</button>
						</label>
					</div>

					<div class="form-control">
						<div class="label pb-1">
							<span class="label-text text-xs font-semibold uppercase text-base-content/60">
								{t("settings.llmModal.modelName")}
							</span>
						</div>
						<div class="join w-full">
							<label
								class={cn(
									"input input-bordered join-item flex items-center gap-2 w-full",
									getFieldError(["model"]) && "input-error",
								)}
							>
								<Box size={16} class="text-base-content/60" />
								<input
									type="text"
									class="grow bg-transparent"
									value={formData().model || ""}
									onChange={(e) =>
										setFormData({
											...formData(),
											model: e.currentTarget.value,
										})
									}
									placeholder={t("settings.llmModal.modelNamePlaceholder")}
								/>
							</label>
							<Button
								type="button"
								variant="primary"
								size="sm"
								class="join-item gap-2"
								onClick={handleFetchModels}
								loading={isLoadingModels()}
								disabled={isLoadingModels() || !formData().baseUrl}
							>
								<RefreshCcw size={14} />
								<span class="hidden sm:inline">{t("actions.fetchModels")}</span>
							</Button>
						</div>
						{availableModels().length > 0 && (
							<select
								class="select select-bordered select-sm mt-2"
								value={formData().model}
								onChange={(e) =>
									setFormData({ ...formData(), model: e.currentTarget.value })
								}
							>
								<option value="">{t("common.selectModel")}</option>
								{availableModels().map((model) => (
									<option value={model}>{model}</option>
								))}
							</select>
						)}
						{renderError(["model"])}
						{modelFetchError() && (
							<div class="label py-1">
								<span class="label-text-alt text-xs text-error">
									{modelFetchError()}
								</span>
							</div>
						)}
						{availableModels().length > 0 && (
							<div class="label py-1">
								<span class="label-text-alt text-xs">
									{t("common.modelsLoaded", [
										availableModels().length.toString(),
									])}
								</span>
							</div>
						)}
					</div>
				</div>

				<div class="grid gap-4 md:grid-cols-2">
					<div class="form-control">
						<div class="label pb-1">
							<span class="label-text text-xs font-semibold uppercase text-base-content/60">
								{t("settings.llmModal.temperature")}
							</span>
						</div>
						<label class="input input-bordered flex items-center gap-2">
							<Thermometer size={16} class="text-base-content/60" />
							<input
								type="number"
								step="0.1"
								class="grow bg-transparent"
								value={formData().temperature ?? ""}
								onChange={(e) =>
									setFormData({
										...formData(),
										temperature: e.currentTarget.value
											? Number(e.currentTarget.value)
											: undefined,
									})
								}
								placeholder="0.7"
							/>
						</label>
					</div>

					<div class="form-control">
						<div class="label pb-1">
							<span class="label-text text-xs font-semibold uppercase text-base-content/60">
								{t("settings.llmModal.maxTokens")}
							</span>
						</div>
						<label class="input input-bordered flex items-center gap-2">
							<Package size={16} class="text-base-content/60" />
							<input
								type="number"
								class="grow bg-transparent"
								value={formData().maxOutputTokens ?? ""}
								onChange={(e) =>
									setFormData({
										...formData(),
										maxOutputTokens: e.currentTarget.value
											? Number(e.currentTarget.value)
											: undefined,
									})
								}
								placeholder="2048"
							/>
						</label>
					</div>
				</div>

				<QueueOverrideFields
					value={formData().queue}
					defaults={props.queueDefaults}
					onChange={(queue) =>
						setFormData((prev) => ({
							...prev,
							queue,
						}))
					}
				/>
			</div>
		</Modal>
	);
};
