import type { ServiceSettings } from "~/utils/settings";

export type ServiceByType<TType extends ServiceSettings["type"]> = Extract<
	ServiceSettings,
	{ type: TType }
>;

export function selectServicesByType<TType extends ServiceSettings["type"]>(
	services: Record<string, ServiceSettings>,
	type: TType,
): Record<string, ServiceByType<TType>> {
	const subset: Record<string, ServiceByType<TType>> = {};
	Object.entries(services).forEach(([id, service]) => {
		if (service.type === type) {
			subset[id] = service as ServiceByType<TType>;
		}
	});
	return subset;
}

export function replaceServicesOfType<
	TType extends ServiceSettings["type"],
>(
	services: Record<string, ServiceSettings>,
	type: TType,
	replacements: Record<string, ServiceByType<TType>>,
): Record<string, ServiceSettings> {
	const retained: Record<string, ServiceSettings> = {};
	Object.entries(services).forEach(([id, service]) => {
		if (service.type !== type) {
			retained[id] = service;
		}
	});
	return { ...retained, ...replacements };
}
