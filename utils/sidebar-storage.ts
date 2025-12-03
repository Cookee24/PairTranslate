import { browser } from "#imports";
import { STORAGE_KEYS } from "~/utils/constants";

export type SidebarSettings = {
	modelId?: string;
	targetLang?: string;
};

export type SidebarHistoryItem = {
	id: string;
	text: string;
	translation: string;
	modelId?: string;
	targetLang?: string;
	createdAt: number;
};

export const SIDEBAR_HISTORY_LIMIT = 20;

const sanitizeHistory = (value: unknown): SidebarHistoryItem[] => {
	if (!Array.isArray(value)) return [];
	return value.filter((item) => {
		if (!item || typeof item !== "object") return false;
		const candidate = item as SidebarHistoryItem;
		return (
			typeof candidate.text === "string" &&
			typeof candidate.translation === "string" &&
			typeof candidate.createdAt === "number" &&
			typeof candidate.id === "string"
		);
	});
};

export async function loadSidebarSettings(): Promise<SidebarSettings> {
	const res = await browser.storage.local.get(STORAGE_KEYS.sidebarSettings);
	const settings = res[STORAGE_KEYS.sidebarSettings] as SidebarSettings;
	return settings ?? {};
}

export async function saveSidebarSettings(
	settings: SidebarSettings,
): Promise<void> {
	await browser.storage.local.set({
		[STORAGE_KEYS.sidebarSettings]: settings,
	});
}

export async function loadSidebarHistory(): Promise<SidebarHistoryItem[]> {
	const res = await browser.storage.local.get(STORAGE_KEYS.sidebarHistory);
	const history = sanitizeHistory(res[STORAGE_KEYS.sidebarHistory]);
	return history;
}

export async function addSidebarHistoryEntry(
	entry: Omit<SidebarHistoryItem, "id" | "createdAt">,
): Promise<SidebarHistoryItem[]> {
	const history = await loadSidebarHistory();
	const id =
		typeof crypto.randomUUID === "function"
			? crypto.randomUUID()
			: `${Date.now()}-${Math.random().toString(16).slice(2)}`;
	const record: SidebarHistoryItem = {
		...entry,
		id,
		createdAt: Date.now(),
	};
	const next = [record, ...history].slice(0, SIDEBAR_HISTORY_LIMIT);
	await browser.storage.local.set({
		[STORAGE_KEYS.sidebarHistory]: next,
	});
	return next;
}

export async function clearSidebarHistory(): Promise<void> {
	await browser.storage.local.remove(STORAGE_KEYS.sidebarHistory);
}
