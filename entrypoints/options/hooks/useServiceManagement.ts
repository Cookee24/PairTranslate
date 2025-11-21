import { trackDeep } from "@solid-primitives/deep";
import type { Accessor } from "solid-js";
import { createEffect, createSignal } from "solid-js";
import { unwrap } from "solid-js/store";
import { v4 as uuidv4 } from "uuid";
import type { ServiceSettings } from "~/utils/settings";

export interface UseServiceManagementReturn<T extends ServiceSettings> {
	services: Accessor<[string, T][]>;
	showModal: Accessor<boolean>;
	editingService: Accessor<[string, T] | undefined>;
	handleAddService: () => void;
	handleEditService: (serviceId: string) => void;
	handleDeleteService: (serviceId: string) => void;
	handleSaveService: (config: T) => void;
	handleCloseModal: () => void;
}

export function useServiceManagement<T extends ServiceSettings>(
	getServices: () => Record<string, T>,
	setServices: (
		updater: (data: Record<string, T>) => Record<string, T>,
	) => void,
): UseServiceManagementReturn<T> {
	const [showModal, setShowModal] = createSignal(false);
	const [editingService, setEditingService] = createSignal<
		[string, T] | undefined
	>();
	const [services, setServicesList] = createSignal<[string, T][]>([]);

	createEffect(() => {
		const servicesData = getServices();
		const unwrapped = unwrap(trackDeep(servicesData));
		setServicesList(Object.entries(unwrapped));
	});

	const handleAddService = () => {
		setEditingService(undefined);
		setShowModal(true);
	};

	const handleEditService = (serviceId: string) => {
		const service = getServices()[serviceId];
		if (service) {
			setEditingService([serviceId, service]);
			setShowModal(true);
		}
	};

	const handleDeleteService = (serviceId: string) => {
		setServices((data) => {
			if (serviceId in data) {
				delete data[serviceId];
				setServicesList(Object.entries(data));
			}
			return { ...data };
		});
	};

	const handleSaveService = (config: T) => {
		const e = editingService();
		if (e) {
			const [id, _] = e;
			setServices((data) => ({ ...data, [id]: config }));
		} else {
			const newId = uuidv4();
			setServices((data) => ({ ...data, [newId]: config }));
		}
	};

	const handleCloseModal = () => {
		setShowModal(false);
		setEditingService(undefined);
	};

	return {
		services,
		showModal,
		editingService,
		handleAddService,
		handleEditService,
		handleDeleteService,
		handleSaveService,
		handleCloseModal,
	};
}
