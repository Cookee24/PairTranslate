import type z from "zod";
import { TraditionalTranslationConfig } from "~/utils/settings/def";

interface TraditionalModalProps {
	modelInfo?: z.infer<typeof TraditionalTranslationConfig>;
	onSave: (config: z.infer<typeof TraditionalTranslationConfig>) => void;
	onClose: () => void;
	open?: boolean;
}

export default (props: TraditionalModalProps) => {
	const DEFAULT: TraditionalTranslationConfig = {
		name: "",
		baseUrl: undefined,
		apiSpec: "microsoft",
		apiKey: undefined,
		region: undefined,
	};
	const [formData, setFormData] = createSignal(props.modelInfo || DEFAULT);

	const [validationErrors, setValidationErrors] =
		createSignal<z.ZodError | null>(null);

	createEffect(
		on(
			() => props.modelInfo,
			(info) => setFormData(info || DEFAULT),
		),
	);

	const handleSave = (e: Event) => {
		e.preventDefault();
		const result = TraditionalTranslationConfig.safeParse(formData());
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
					? t("settings.traditionalModal.editTitle")
					: t("settings.traditionalModal.addTitle")
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
							{t("settings.traditionalModal.serviceName")}
						</span>
					</label>
					<input
						type="text"
						class={`input input-bordered ${getFieldError(["name"]) ? "input-error" : ""}`}
						value={formData().name}
						onChange={(e) =>
							setFormData({ ...formData(), name: e.target.value })
						}
						placeholder={t("settings.traditionalModal.serviceNamePlaceholder")}
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
						<span class="label-text">
							{t("settings.traditionalModal.apiSpec")}
						</span>
					</label>
					<select
						class="select select-bordered"
						value={formData().apiSpec}
						onChange={(e) =>
							setFormData({
								...formData(),
								apiSpec: e.target.value as TranslationService,
							})
						}
					>
						{(["microsoft", "google", "deepl", "deeplx"] as const).map(
							(spec) => (
								<option value={spec}>
									{t(`settings.traditionalModal.apiSpecs.${spec}`)}
								</option>
							),
						)}
					</select>
				</div>

				<div class="form-control">
					<label class="label m-2">
						<span class="label-text">
							{t("settings.traditionalModal.baseUrl")}
						</span>
					</label>
					<input
						type="url"
						class={`input input-bordered ${getFieldError(["baseUrl"]) ? "input-error" : ""}`}
						value={formData().baseUrl || ""}
						onChange={(e) => {
							const value =
								e.target.value.trim() === "" ? undefined : e.target.value;
							setFormData({ ...formData(), baseUrl: value });
						}}
						placeholder={t("settings.traditionalModal.baseUrlPlaceholder")}
					/>
					{getFieldError(["baseUrl"]) && (
						<label class="label m-2">
							<span class="label-text-alt text-error">
								{getFieldError(["baseUrl"])?.message}
							</span>
						</label>
					)}
					<label class="label m-2">
						<span class="label-text-alt text-xs">
							{t("settings.traditionalModal.baseUrlDesc")}
						</span>
					</label>
				</div>

				<div class="form-control">
					<label class="label m-2">
						<span class="label-text">
							{t("settings.traditionalModal.apiKey")}
						</span>
					</label>
					<input
						type="password"
						class="input input-bordered"
						value={formData().apiKey || ""}
						onChange={(e) => {
							const value =
								e.target.value.trim() === "" ? undefined : e.target.value;
							setFormData({ ...formData(), apiKey: value });
						}}
						placeholder={t("settings.traditionalModal.apiKeyPlaceholder")}
					/>
					<label class="label m-2">
						<span class="label-text-alt text-xs">
							{t("settings.traditionalModal.apiKeyDesc")}
						</span>
					</label>
				</div>

				<div class="form-control">
					<label class="label m-2">
						<span class="label-text">
							{t("settings.traditionalModal.region")}
						</span>
					</label>
					<input
						type="text"
						class="input input-bordered"
						value={formData().region || ""}
						onChange={(e) => {
							const value =
								e.target.value.trim() === "" ? undefined : e.target.value;
							setFormData({ ...formData(), region: value });
						}}
						placeholder={t("settings.traditionalModal.regionPlaceholder")}
					/>
					<label class="label m-2">
						<span class="label-text-alt text-xs">
							{t("settings.traditionalModal.regionDesc")}
						</span>
					</label>
				</div>
			</div>
		</Modal>
	);
};
