import {
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
} from "solid-js";
import { browser } from "wxt/browser";
import type { DomainTimersMap } from "~/utils/constants";
import { DOMAIN_TIMER_UNTIL_CLOSE, STORAGE_KEYS } from "~/utils/constants";

const getStorageKey = (domain: string) => {
	const parts = domain.split(".");
	if (parts.length <= 2) {
		return domain;
	}
	// Suffix matching the last two parts of the domain
	return parts.slice(-2).reverse().join(".");
};

type DomainTimerValue = DomainTimersMap[string];

export function createDomainEnabledTimer(
	domain: () => string = () => window.location.hostname,
) {
	const domainKey = createMemo(() => {
		const domain_ = domain();
		if (!domain_) return "";
		return getStorageKey(domain_);
	});
	const [remaining, setRemaining] = createSignal<number | undefined>(undefined);

	const updateRemainingFromTimerValue = (value?: DomainTimerValue) => {
		if (value === DOMAIN_TIMER_UNTIL_CLOSE) {
			setRemaining(Number.POSITIVE_INFINITY);
			return;
		}
		if (typeof value === "number" && value > Date.now()) {
			setRemaining((value - Date.now()) / 1000);
		} else {
			setRemaining(undefined);
		}
	};

	createEffect(
		on(domainKey, (key) => {
			if (!key) {
				setRemaining(undefined);
				return;
			}

			let disposed = false;

			const syncFromStorage = async () => {
				const result = await browser.storage.local.get([
					STORAGE_KEYS.domainTimers,
				]);
				if (disposed) return;
				const timers = (result[STORAGE_KEYS.domainTimers] ??
					{}) as DomainTimersMap;
				updateRemainingFromTimerValue(timers[key]);
			};

			syncFromStorage();

			const listener: Parameters<
				typeof browser.storage.onChanged.addListener
			>[0] = (changes, areaName) => {
				if (areaName !== "local") return;
				const timersChange = changes[STORAGE_KEYS.domainTimers];
				if (!timersChange) return;
				const timers = (timersChange.newValue ?? {}) as DomainTimersMap;
				updateRemainingFromTimerValue(timers[key]);
			};

			browser.storage.onChanged.addListener(listener);
			onCleanup(() => {
				disposed = true;
				browser.storage.onChanged.removeListener(listener);
			});
		}),
	);

	return [
		remaining,
		async (duration: number | typeof DOMAIN_TIMER_UNTIL_CLOSE) => {
			const key = domainKey();
			if (!key) return;

			const result = await browser.storage.local.get([
				STORAGE_KEYS.domainTimers,
			]);
			const timers = {
				...((result[STORAGE_KEYS.domainTimers] ?? {}) as DomainTimersMap),
			};
			let nextValue: DomainTimerValue | undefined;

			if (duration === DOMAIN_TIMER_UNTIL_CLOSE) {
				nextValue = DOMAIN_TIMER_UNTIL_CLOSE;
				timers[key] = DOMAIN_TIMER_UNTIL_CLOSE;
			} else if (typeof duration === "number" && duration > 0) {
				nextValue = Date.now() + duration * 1000;
				timers[key] = nextValue;
			} else {
				delete timers[key];
				nextValue = undefined;
			}

			updateRemainingFromTimerValue(nextValue);

			if (Object.keys(timers).length === 0) {
				await browser.storage.local.remove(STORAGE_KEYS.domainTimers);
			} else {
				await browser.storage.local.set({
					[STORAGE_KEYS.domainTimers]: timers,
				});
			}
		},
	] as const;
}
