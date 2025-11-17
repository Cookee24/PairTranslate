import { trackDeep } from "@solid-primitives/deep";
import type { Accessor } from "solid-js";
import { createEffect, createSignal } from "solid-js";
import { unwrap } from "solid-js/store";
import type { WebsiteRuleSettings } from "~/utils/settings/def";

export interface UseWebsiteRuleManagementReturn {
	rules: Accessor<[number, WebsiteRuleSettings][]>;
	showModal: Accessor<boolean>;
	editingRule: Accessor<[number, WebsiteRuleSettings] | undefined>;
	handleAddRule: () => void;
	handleEditRule: (index: number) => void;
	handleDeleteRule: (index: number) => void;
	handleSaveRule: (config: WebsiteRuleSettings) => void;
	handleCloseModal: () => void;
}

export function useWebsiteRuleManagement(
	getRules: () => WebsiteRuleSettings[],
	setRules: (
		updater: (data: WebsiteRuleSettings[]) => WebsiteRuleSettings[],
	) => void,
): UseWebsiteRuleManagementReturn {
	const [showModal, setShowModal] = createSignal(false);
	const [editingRule, setEditingRule] = createSignal<
		[number, WebsiteRuleSettings] | undefined
	>();
	const [rules, setRulesList] = createSignal<[number, WebsiteRuleSettings][]>(
		[],
	);

	createEffect(() => {
		const rulesData = getRules();
		const unwrapped = unwrap(trackDeep(rulesData));
		setRulesList(unwrapped.map((rule, index) => [index, rule]));
	});

	const handleAddRule = () => {
		setEditingRule(undefined);
		setShowModal(true);
	};

	const handleEditRule = (index: number) => {
		const rulesData = getRules();
		const rule = rulesData[index];
		if (rule) {
			setEditingRule([index, rule]);
			setShowModal(true);
		}
	};

	const handleDeleteRule = (index: number) => {
		setRules((data) => {
			const newData = [...data];
			newData.splice(index, 1);
			return newData;
		});
	};

	const handleSaveRule = (config: WebsiteRuleSettings) => {
		const e = editingRule();
		if (e) {
			const [index, _] = e;
			setRules((data) => {
				const newData = [...data];
				newData[index] = config;
				return newData;
			});
		} else {
			setRules((data) => [...data, config]);
		}
	};

	const handleCloseModal = () => {
		setShowModal(false);
		setEditingRule(undefined);
	};

	return {
		rules,
		showModal,
		editingRule,
		handleAddRule,
		handleEditRule,
		handleDeleteRule,
		handleSaveRule,
		handleCloseModal,
	};
}
