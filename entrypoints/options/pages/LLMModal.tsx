import type z from "zod";
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

	createEffect(
		on(
			() => props.modelInfo,
			(info) => setFormData(info || DEFAULT),
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
			<div class="space-y-4">
				<div class="form-control">
					<label class="label m-2">
						<span class="label-text">
							{t("settings.llmModal.serviceTemplate")}
						</span>
					</label>
					<select
						class="select select-bordered"
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
					<label class="label m-2">
						<span class="label-text">{t("settings.llmModal.serviceName")}</span>
					</label>
					<input
						type="text"
						class={`input input-bordered ${getFieldError(["name"]) ? "input-error" : ""}`}
						value={formData().name}
						onChange={(e) =>
							setFormData({ ...formData(), name: e.target.value })
						}
						placeholder={t("settings.llmModal.serviceNamePlaceholder")}
					/>
					{getFieldError(["name"]) && (
						<label class="label m-2">
							<span class="label-text-alt text-error">
								{getFieldError(["name"])?.message}
							</span>
						</label>
					)}
				</div>

				<div class="form-control">
					<label class="label m-2">
						<span class="label-text">{t("settings.llmModal.baseUrl")}</span>
					</label>
					<input
						type="url"
						class={`input input-bordered ${getFieldError(["baseUrl"]) ? "input-error" : ""}`}
						value={formData().baseUrl}
						onChange={(e) =>
							setFormData({ ...formData(), baseUrl: e.target.value })
						}
						placeholder={t("settings.llmModal.baseUrlPlaceholder")}
					/>
					{getFieldError(["baseUrl"]) && (
						<label class="label m-2">
							<span class="label-text-alt text-error">
								{getFieldError(["baseUrl"])?.message}
							</span>
						</label>
					)}
				</div>

				<div class="form-control">
					<label class="label m-2">
						<span class="label-text">{t("settings.llmModal.apiSpec")}</span>
					</label>
					<select
						class="select select-bordered"
						value={formData().apiSpec}
						onChange={(e) =>
							setFormData({
								...formData(),
								apiSpec: e.target.value as "openai" | "anthropic" | "google",
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
					<label class="label m-2">
						<span class="label-text">{t("settings.llmModal.apiKey")}</span>
					</label>
					<input
						type="password"
						class="input input-bordered"
						value={formData().apiKey || ""}
						onChange={(e) =>
							setFormData({ ...formData(), apiKey: e.target.value })
						}
						placeholder={t("settings.llmModal.apiKeyPlaceholder")}
					/>
				</div>

				<div class="form-control">
					<label class="label m-2">
						<span class="label-text">{t("settings.llmModal.modelName")}</span>
					</label>
					<div class="join">
						<input
							type="text"
							class={`input input-bordered join-item ${getFieldError(["model"]) ? "input-error" : ""}`}
							value={formData().model || ""}
							onChange={(e) =>
								setFormData({ ...formData(), model: e.target.value })
							}
							placeholder={t("settings.llmModal.modelNamePlaceholder")}
						/>
						{availableModels().length > 0 && (
							<select
								class="select select-bordered join-item"
								value={formData().model}
								onChange={(e) =>
									setFormData({ ...formData(), model: e.target.value })
								}
							>
								<option value="">{t("common.selectModel")}</option>
								{availableModels().map((model) => (
									<option value={model}>{model}</option>
								))}
							</select>
						)}
						<Button
							variant="ghost"
							size="sm"
							class="join-item"
							onClick={handleFetchModels}
							disabled={isLoadingModels() || !formData().baseUrl}
						>
							{isLoadingModels() ? <Loading /> : t("actions.fetchModels")}
						</Button>
					</div>
					{getFieldError(["model"]) && (
						<label class="label m-2">
							<span class="label-text-alt text-error">
								{getFieldError(["model"])?.message}
							</span>
						</label>
					)}
					{modelFetchError() && (
						<label class="label m-2">
							<span class="label-text-alt text-error text-wrap">
								{modelFetchError()}
							</span>
						</label>
					)}
					{availableModels().length > 0 && (
						<label class="label m-2">
							<span class="label-text-alt text-xs">
								{t("common.modelsLoaded", [
									availableModels().length.toString(),
								])}
							</span>
						</label>
					)}
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="form-control">
						<label class="label m-2">
							<span class="label-text">
								{t("settings.llmModal.temperature")}
							</span>
						</label>
						<input
							type="number"
							class="input input-bordered"
							step="0.1"
							value={formData().temperature}
							onChange={(e) =>
								setFormData({
									...formData(),
									temperature: e.target.value
										? Number(e.target.value)
										: undefined,
								})
							}
						/>
					</div>

					<div class="form-control">
						<label class="label m-2">
							<span class="label-text">{t("settings.llmModal.maxTokens")}</span>
						</label>
						<input
							type="number"
							class="input input-bordered"
							value={formData().maxOutputTokens}
							onChange={(e) =>
								setFormData({
									...formData(),
									maxOutputTokens: e.target.value
										? Number(e.target.value)
										: undefined,
								})
							}
						/>
					</div>
				</div>

				<div class="divider" />
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
