import { Eye, EyeOff, Globe, KeyRound, MapPin, SquarePen } from "lucide-solid";
import { createEffect, createSignal, on } from "solid-js";
import type z from "zod";
import { Button } from "~/components/Button";
import { Modal } from "~/components/Modal";
import { cn } from "~/utils/cn";
import { t } from "~/utils/i18n";
import {
	type QueueControlSettings,
	TraditionalServiceSettings,
} from "~/utils/settings/def";
import { QueueOverrideFields } from "../components/QueueOverrideFields";

type TraditionalService = z.infer<typeof TraditionalServiceSettings>;
type TraditionalApiSpec = TraditionalService["apiSpec"];

interface TraditionalModalProps {
	modelInfo?: TraditionalService;
	onSave: (config: TraditionalService) => void;
	onClose: () => void;
	open?: boolean;
	queueDefaults: QueueControlSettings;
}

export default (props: TraditionalModalProps) => {
	const DEFAULT: TraditionalService = {
		type: "traditional",
		name: "",
		baseUrl: undefined,
		apiSpec: "microsoft",
		apiKey: undefined,
		region: undefined,
	};
	const [formData, setFormData] = createSignal(props.modelInfo || DEFAULT);

	const [validationErrors, setValidationErrors] =
		createSignal<z.ZodError | null>(null);
	const [apiKeyVisible, setApiKeyVisible] = createSignal(false);

	createEffect(
		on(
			[() => props.modelInfo, () => props.open],
			([info, open]) => open && setFormData(info || DEFAULT),
		),
	);

	const handleSave = (e: Event) => {
		e.preventDefault();
		const result = TraditionalServiceSettings.safeParse(formData());
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
			<div class="space-y-6">
				<div class="grid gap-4 md:grid-cols-2">
					<div class="form-control">
						<div class="label pb-1">
							<span class="label-text text-xs font-semibold uppercase text-base-content/60">
								{t("settings.traditionalModal.serviceName")}
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
								placeholder={t(
									"settings.traditionalModal.serviceNamePlaceholder",
								)}
							/>
						</label>
						{renderError(["name"])}
					</div>

					<div class="form-control">
						<div class="label pb-1">
							<span class="label-text text-xs font-semibold uppercase text-base-content/60">
								{t("settings.traditionalModal.apiSpec")}
							</span>
						</div>
						<select
							class="select select-bordered w-full"
							value={formData().apiSpec}
							onChange={(e) =>
								setFormData({
									...formData(),
									apiSpec: e.currentTarget.value as TraditionalApiSpec,
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
				</div>

				<div class="grid gap-4 md:grid-cols-2">
					<div class="form-control">
						<div class="label pb-1">
							<span class="label-text text-xs font-semibold uppercase text-base-content/60">
								{t("settings.traditionalModal.baseUrl")}
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
								value={formData().baseUrl || ""}
								onChange={(e) => {
									const value =
										e.currentTarget.value.trim() === ""
											? undefined
											: e.currentTarget.value;
									setFormData({ ...formData(), baseUrl: value });
								}}
								placeholder={t("settings.traditionalModal.baseUrlPlaceholder")}
							/>
						</label>
						{renderError(["baseUrl"])}
						<div class="label py-1">
							<span class="label-text-alt text-xs">
								{t("settings.traditionalModal.baseUrlDesc")}
							</span>
						</div>
					</div>

					<div class="form-control">
						<div class="label pb-1">
							<span class="label-text text-xs font-semibold uppercase text-base-content/60">
								{t("settings.traditionalModal.region")}
							</span>
						</div>
						<label class="input input-bordered flex items-center gap-2">
							<MapPin size={16} class="text-base-content/60" />
							<input
								type="text"
								class="grow bg-transparent"
								value={formData().region || ""}
								onChange={(e) => {
									const value =
										e.currentTarget.value.trim() === ""
											? undefined
											: e.currentTarget.value;
									setFormData({ ...formData(), region: value });
								}}
								placeholder={t("settings.traditionalModal.regionPlaceholder")}
							/>
						</label>
						<div class="label py-1">
							<span class="label-text-alt text-xs">
								{t("settings.traditionalModal.regionDesc")}
							</span>
						</div>
					</div>
				</div>

				<div class="form-control">
					<div class="label pb-1">
						<span class="label-text text-xs font-semibold uppercase text-base-content/60">
							{t("settings.traditionalModal.apiKey")}
						</span>
					</div>
					<label class="input input-bordered flex items-center gap-2">
						<KeyRound size={16} class="text-base-content/60" />
						<input
							type={apiKeyVisible() ? "text" : "password"}
							class="grow bg-transparent"
							value={formData().apiKey || ""}
							onChange={(e) => {
								const value =
									e.currentTarget.value.trim() === ""
										? undefined
										: e.currentTarget.value;
								setFormData({ ...formData(), apiKey: value });
							}}
							placeholder={t("settings.traditionalModal.apiKeyPlaceholder")}
						/>
						<button
							type="button"
							class="btn btn-ghost btn-xs btn-circle"
							onClick={() => setApiKeyVisible((value) => !value)}
						>
							{apiKeyVisible() ? (
								<EyeOff size={14} class="text-base-content/60" />
							) : (
								<Eye size={14} class="text-base-content/60" />
							)}
						</button>
					</label>
					<div class="label py-1">
						<span class="label-text-alt text-xs">
							{t("settings.traditionalModal.apiKeyDesc")}
						</span>
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
