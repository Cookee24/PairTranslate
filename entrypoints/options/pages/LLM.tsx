import { Box, Cpu, Link, Pencil, Trash2 } from "lucide-solid";
import type { StoreSetter } from "solid-js/store";
import { QueueSummary } from "~/components/settings/QueueSummary";
import { SectionResetButton } from "~/components/settings/SectionResetButton";
import { ServiceManager } from "~/components/settings/ServiceManager";
import { useSettings } from "~/hooks/settings";
import { t } from "~/utils/i18n";
import type { ServicesSettings } from "~/utils/settings";
import {
	type ServiceByType,
	selectServicesByType,
} from "~/utils/settings/services";
import { useServiceManagement } from "../hooks/useServiceManagement";
import LLMModal from "./LLMModal";

export default (props: { navId: string }) => {
	const { settings, setSettings } = useSettings();
	type LLMService = ServiceByType<"llm">;

	const getLLMServices = () => selectServicesByType(settings.services, "llm");

	const setLLMServices = (updater: StoreSetter<ServicesSettings>) =>
		// @ts-ignore
		setSettings("services", updater);

	const {
		services: llmServices,
		showModal,
		editingService,
		handleAddService,
		handleEditService,
		handleDeleteService,
		handleSaveService,
		handleCloseModal,
	} = useServiceManagement<LLMService>(getLLMServices, setLLMServices);

	const renderLLMServiceCard = ({
		service,
		onEdit,
		onDelete,
	}: {
		id: string;
		service: LLMService;
		onEdit: () => void;
		onDelete: () => void;
	}) => (
		<div class="card border border-base-200 bg-base-100 shadow-sm">
			<div class="card-body p-5">
				<div class="flex items-start justify-between gap-4">
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-primary/10 p-2 text-primary">
							<Box size={20} />
						</div>
						<div>
							<h3 class="card-title text-lg">{service.name}</h3>
							<p class="text-xs uppercase tracking-wide text-base-content/60">
								{service.apiSpec.toUpperCase()}
							</p>
						</div>
					</div>
					<div class="join">
						<button
							type="button"
							class="btn btn-sm btn-ghost join-item tooltip"
							data-tip={t("common.edit")}
							onClick={onEdit}
						>
							<Pencil size={16} />
						</button>
						<button
							type="button"
							class="btn btn-sm btn-ghost text-error join-item tooltip"
							data-tip={t("common.delete")}
							onClick={onDelete}
						>
							<Trash2 size={16} />
						</button>
					</div>
				</div>

				<div class="mt-4 flex flex-wrap gap-2">
					{service.baseUrl && (
						<div class="badge badge-neutral gap-1 p-3 text-xs">
							<Link size={12} />
							<span class="truncate max-w-40">{service.baseUrl}</span>
						</div>
					)}
					{service.model && (
						<div class="badge badge-outline gap-1 p-3 text-xs">
							<Cpu size={12} />
							{service.model}
						</div>
					)}
					{typeof service.temperature === "number" && (
						<div class="badge badge-ghost gap-1 p-3 text-xs">
							{t("settings.llmServices.serviceDetails.temperature")}{" "}
							{service.temperature}
						</div>
					)}
				</div>

				<QueueSummary queue={service.queue} defaults={settings.queue} />
			</div>
		</div>
	);

	const handleReset = () => setLLMServices(() => ({}));

	return (
		<>
			<ServiceManager
				title={t("settings.llmServices.title")}
				navId={props.navId}
				services={llmServices()}
				addServiceLabel={t("settings.llmServices.addService")}
				noServicesConfigured={t("settings.llmServices.noServicesConfigured")}
				noServicesDesc={t("settings.llmServices.noServicesDesc")}
				onAddService={handleAddService}
				onEditService={handleEditService}
				onDeleteService={handleDeleteService}
				renderServiceCard={renderLLMServiceCard}
				extraActions={<SectionResetButton onReset={handleReset} />}
			/>

			<LLMModal
				open={showModal()}
				modelInfo={editingService()?.[1]}
				onSave={handleSaveService}
				onClose={handleCloseModal}
				queueDefaults={settings.queue}
			/>
		</>
	);
};
