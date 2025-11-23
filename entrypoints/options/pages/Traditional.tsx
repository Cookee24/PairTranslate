import { TestTube2 } from "lucide-solid";
import { createSignal } from "solid-js";
import { Button } from "~/components/Button";
import { QueueSummary } from "~/components/settings/QueueSummary";
import { SectionResetButton } from "~/components/settings/SectionResetButton";
import { ServiceManager } from "~/components/settings/ServiceManager";
import { useSettings } from "~/hooks/settings";
import { t } from "~/utils/i18n";
import {
	replaceServicesOfType,
	type ServiceByType,
	selectServicesByType,
} from "~/utils/settings/services";
import { useServiceManagement } from "../hooks/useServiceManagement";
import BrowserTranslatorModal from "./BrowserTranslatorModal";
import TraditionalModal from "./TraditionalModal";

export default (props: { navId: string }) => {
	const { settings, setSettings } = useSettings();
	const [showBrowserTranslatorModal, setShowBrowserTranslatorModal] =
		createSignal(false);

	type TraditionalService = ServiceByType<"traditional">;

	const getTraditionalServices = () =>
		selectServicesByType(settings.services, "traditional");

	const setTraditionalServices = (
		updater: (
			data: Record<string, TraditionalService>,
		) => Record<string, TraditionalService>,
	) =>
		setSettings("services", (services) => {
			const subset = selectServicesByType(services, "traditional");
			const updatedSubset = updater({ ...subset });
			return replaceServicesOfType(services, "traditional", updatedSubset);
		});

	const {
		services,
		showModal,
		editingService,
		handleAddService,
		handleEditService,
		handleDeleteService,
		handleSaveService,
		handleCloseModal,
	} = useServiceManagement<TraditionalService>(
		getTraditionalServices,
		setTraditionalServices,
	);

	const renderTraditionalServiceDetails = (service: TraditionalService) => (
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
			<QueueSummary queue={service.queue} defaults={settings.queue} />
		</div>
	);

	const handleReset = () => setTraditionalServices(() => ({}));

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
					<>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowBrowserTranslatorModal(true)}
						>
							<TestTube2 size={16} />
							{t("settings.traditionalServices.checkBrowserTranslator")}
						</Button>
						<SectionResetButton onReset={handleReset} />
					</>
				}
			/>

			<TraditionalModal
				open={showModal()}
				modelInfo={editingService()?.[1]}
				onSave={handleSaveService}
				onClose={handleCloseModal}
				queueDefaults={settings.queue}
			/>

			<BrowserTranslatorModal
				open={showBrowserTranslatorModal()}
				onClose={() => setShowBrowserTranslatorModal(false)}
				onAddService={handleSaveService}
			/>
		</>
	);
};
