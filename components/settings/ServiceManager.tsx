import { Plus } from "lucide-solid";
import { For, type JSX } from "solid-js";
import { Button } from "~/components/Button";
import type { ServiceSettings } from "~/utils/settings";
import { SettingsCard } from "./SettingsCard";

export interface ServiceManagerProps<
	T extends ServiceSettings = ServiceSettings,
> {
	title: string;
	navId: string;
	services: [string, T][];
	addServiceLabel: string;
	noServicesConfigured: string;
	noServicesDesc: string;
	onAddService: () => void;
	onEditService: (id: string) => void;
	onDeleteService: (id: string) => void;
	renderServiceCard: (context: {
		id: string;
		service: T;
		onEdit: () => void;
		onDelete: () => void;
	}) => JSX.Element;
	extraActions?: JSX.Element;
}

export const ServiceManager = <T extends ServiceSettings>(
	props: ServiceManagerProps<T>,
) => {
	return (
		<SettingsCard title={props.title} navId={props.navId}>
			<div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-base-200 bg-base-50 px-4 py-3 text-sm text-base-content/70">
				<div class="flex flex-wrap gap-2">{props.extraActions}</div>
				<Button variant="primary" size="sm" onClick={props.onAddService}>
					<Plus size={16} />
					{props.addServiceLabel}
				</Button>
			</div>

			{props.services.length === 0 && (
				<div class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-base-300 bg-base-100 p-8 text-center text-base-content/70">
					<p class="text-base font-medium">{props.noServicesConfigured}</p>
					<p class="mt-2 text-sm">{props.noServicesDesc}</p>
					<Button
						variant="ghost"
						class="mt-4"
						size="sm"
						onClick={props.onAddService}
					>
						{props.addServiceLabel}
					</Button>
				</div>
			)}

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<For each={props.services}>
					{([id, service]) =>
						props.renderServiceCard({
							id,
							service,
							onEdit: () => props.onEditService(id),
							onDelete: () => props.onDeleteService(id),
						})
					}
				</For>
			</div>
		</SettingsCard>
	);
};
