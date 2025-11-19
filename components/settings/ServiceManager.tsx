import { Edit, Plus, Trash2 } from "lucide-solid";
import { For, type JSX } from "solid-js";
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
	renderServiceDetails: (service: T) => JSX.Element;
	extraActions?: JSX.Element;
}

export const ServiceManager = <T extends ServiceSettings>(
	props: ServiceManagerProps<T>,
) => {
	return (
		<SettingsCard title={props.title} navId={props.navId}>
			<div class="flex justify-between items-center mb-4">
				<div class="flex gap-2">{props.extraActions}</div>
				<Button variant="primary" size="sm" onClick={props.onAddService}>
					<Plus size={16} />
					{props.addServiceLabel}
				</Button>
			</div>

			{props.services.length === 0 && (
				<div class="text-center py-8 text-base-content/70">
					<p>{props.noServicesConfigured}</p>
					<p class="text-sm mt-2">{props.noServicesDesc}</p>
				</div>
			)}

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<For each={props.services}>
					{([id, service]) => (
						<Card.Root class="bg-base-300 shadow-sm">
							<Card.Body class="p-4">
								<div class="flex justify-between items-start mb-2">
									<h3 class="font-semibold text-lg">{service.name}</h3>
									<div class="flex gap-2">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => props.onEditService(id)}
										>
											<Edit size={14} />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => props.onDeleteService(id)}
										>
											<Trash2 size={14} />
										</Button>
									</div>
								</div>
								{props.renderServiceDetails(service)}
							</Card.Body>
						</Card.Root>
					)}
				</For>
			</div>
		</SettingsCard>
	);
};
