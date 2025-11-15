import { TestTube2 } from "lucide-solid";
import {
	type ServiceConfig,
	ServiceManager,
} from "~/components/settings/ServiceManager";
import { useServiceManagement } from "../hooks/useServiceManagement";
import BrowserTranslatorModal from "./BrowserTranslatorModal";
import TraditionalModal from "./TraditionalModal";

export default (props: { navId: string }) => {
	const { settings, setSettings } = useSettings();
	const [showBrowserTranslatorModal, setShowBrowserTranslatorModal] =
		createSignal(false);

	const {
		services,
		showModal,
		editingService,
		handleAddService,
		handleEditService,
		handleDeleteService,
		handleSaveService,
		handleCloseModal,
	} = useServiceManagement(
		() => settings.services.traditionalServices,
		(updater) => setSettings("services", "traditionalServices", updater),
	);

	const renderTraditionalServiceDetails = (service: ServiceConfig) => (
		<div class="space-y-1 text-sm text-base-content/70 overflow-ellipsis">
			<p>
				<strong>{t("settings.traditionalServices.serviceDetails.api")}:</strong>{" "}
				{service.apiSpec}
			</p>
			{service.baseUrl && (
				<p>
					<strong>
						{t("settings.traditionalServices.serviceDetails.url")}:
					</strong>{" "}
					{service.baseUrl}
				</p>
			)}
			{service.apiKey && (
				<p>
					<strong>
						{t("settings.traditionalServices.serviceDetails.apiKey")}:
					</strong>{" "}
					{t("settings.traditionalServices.serviceDetails.maskedKey")}
				</p>
			)}
		</div>
	);

	return (
		<>
			<ServiceManager
				title={t("settings.traditionalServices.title")}
				navId={props.navId}
				services={services()}
				addServiceLabel={t("settings.traditionalServices.addService")}
				noServicesConfigured={t(
					"settings.traditionalServices.noServicesConfigured",
				)}
				noServicesDesc={t("settings.traditionalServices.noServicesDesc")}
				onAddService={handleAddService}
				onEditService={handleEditService}
				onDeleteService={handleDeleteService}
				renderServiceDetails={renderTraditionalServiceDetails}
				extraActions={
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setShowBrowserTranslatorModal(true)}
					>
						<TestTube2 size={16} />
						{t("settings.traditionalServices.checkBrowserTranslator")}
					</Button>
				}
			/>

			<TraditionalModal
				open={showModal()}
				modelInfo={editingService()?.[1]}
				onSave={handleSaveService}
				onClose={handleCloseModal}
			/>

			<BrowserTranslatorModal
				open={showBrowserTranslatorModal()}
				onClose={() => setShowBrowserTranslatorModal(false)}
				onAddService={handleSaveService}
			/>
		</>
	);
};
