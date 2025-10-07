import {
	type ServiceConfig,
	ServiceManager,
} from "../components/settings/ServiceManager";
import { useServiceManagement } from "../hooks/useServiceManagement";
import LLMModal from "./LLMModal";

export default (props: { navId: string }) => {
	const { settings, setSettings } = useSettings();

	const {
		services: llmServices,
		showModal,
		editingService,
		handleAddService,
		handleEditService,
		handleDeleteService,
		handleSaveService,
		handleCloseModal,
	} = useServiceManagement(
		() => settings.services.llmServices,
		(updater) => setSettings("services", "llmServices", updater),
	);

	const renderLLMServiceDetails = (service: ServiceConfig) => (
		<div class="space-y-1 text-sm text-base-content/70">
			<p>
				<strong>{t("settings.llmServices.serviceDetails.model")}:</strong>{" "}
				{service.model}
			</p>
			<p>
				<strong>{t("settings.llmServices.serviceDetails.api")}:</strong>{" "}
				{service.apiSpec}
			</p>
			<p>
				<strong>{t("settings.llmServices.serviceDetails.url")}:</strong>{" "}
				{service.baseUrl}
			</p>
			{service.temperature && (
				<p>
					<strong>
						{t("settings.llmServices.serviceDetails.temperature")}:
					</strong>{" "}
					{service.temperature}
				</p>
			)}
		</div>
	);

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
				renderServiceDetails={renderLLMServiceDetails}
			/>

			<LLMModal
				open={showModal()}
				modelInfo={editingService()?.[1]}
				onSave={handleSaveService}
				onClose={handleCloseModal}
			/>
		</>
	);
};
