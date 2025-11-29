import { browser } from "#imports";
import {
	DOMAIN_TIMER_UNTIL_CLOSE,
	type DomainTimersMap,
	STORAGE_KEYS,
} from "~/utils/constants";

export async function cleanupDomainTimers() {
	const result = await browser.storage.local.get([STORAGE_KEYS.domainTimers]);
	const timers = (result[STORAGE_KEYS.domainTimers] ?? {}) as DomainTimersMap;
	const now = Date.now();

	const filteredEntries = Object.entries(timers).filter(([, value]) => {
		if (value === DOMAIN_TIMER_UNTIL_CLOSE) return false;
		if (typeof value === "number" && value <= now) return false;
		return true;
	});

	if (filteredEntries.length === Object.keys(timers).length) {
		return;
	}

	if (filteredEntries.length === 0) {
		await browser.storage.local.remove(STORAGE_KEYS.domainTimers);
	} else {
		await browser.storage.local.set({
			[STORAGE_KEYS.domainTimers]: Object.fromEntries(filteredEntries),
		});
	}
}
