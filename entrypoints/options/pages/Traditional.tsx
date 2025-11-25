import { Globe, KeyRound, Link, Pencil, TestTube2, Trash2 } from "lucide-solid";
import { createSignal } from "solid-js";
import type { StoreSetter } from "solid-js/store";
import type { ServicesSettings } from "@/utils/settings";
import { Button } from "~/components/Button";
import { QueueSummary } from "~/components/settings/QueueSummary";
import { SectionResetButton } from "~/components/settings/SectionResetButton";
import { ServiceManager } from "~/components/settings/ServiceManager";
import { useSettings } from "~/hooks/settings";
import { t } from "~/utils/i18n";
import {
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

	const setTraditionalServices = (updater: StoreSetter<ServicesSettings>) =>
		// @ts-ignore
		setSettings("services", updater);

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

	const renderTraditionalServiceCard = ({
		service,
		onEdit,
		onDelete,
	}: {
		id: string;
		service: TraditionalService;
		onEdit: () => void;
		onDelete: () => void;
	}) => (
		<div class="card border border-base-200 bg-base-100 shadow-sm">
			<div class="card-body p-5">
				<div class="flex items-start justify-between gap-4">
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-secondary/10 p-2 text-secondary">
							<Globe size={20} />
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
					<div class="badge badge-outline gap-1 p-3 text-xs">
						<Globe size={12} />
						{service.apiSpec.toUpperCase()}
					</div>
					{service.baseUrl && (
						<div class="badge badge-neutral gap-1 p-3 text-xs">
							<Link size={12} />
							<span class="truncate max-w-40">{service.baseUrl}</span>
						</div>
					)}
					{service.apiKey && (
						<div class="badge badge-ghost gap-1 p-3 text-xs">
							<KeyRound size={12} />
							{t("settings.traditionalServices.serviceDetails.maskedKey")}
						</div>
					)}
				</div>

				<QueueSummary queue={service.queue} defaults={settings.queue} />
			</div>
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
				renderServiceCard={renderTraditionalServiceCard}
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
