import {
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
} from "solid-js";
import { STORAGE_KEYS } from "~/utils/constants";
import { createSessionStorage } from "~/utils/session";

const getStorageKey = (domain: string) => {
	const parts = domain.split(".");
	if (parts.length <= 2) {
		return domain;
	}
	// Suffix matching the last two parts of the domain
	return parts.slice(-2).reverse().join(".");
};

export function createDomainEnabledTimer(
	domain: () => string = () => window.location.hostname,
) {
	const key = createMemo(() => {
		const domain_ = domain();
		if (!domain_) return "";
		return `${STORAGE_KEYS.domainTimer}:${getStorageKey(domain_)}`;
	});
	const [remaining, setRemaining] = createSignal<number | undefined>(undefined);

	const { set, remove, listen } = createSessionStorage<number>();

	createEffect(
		on(key, (key) => {
			if (!key) return;
			const unlisten = listen(key, (timestamp) => {
				if (timestamp && Date.now() < timestamp) {
					// return seconds remaining
					setRemaining((timestamp - Date.now()) / 1000);
				} else {
					setRemaining(undefined);
				}
			});
			onCleanup(unlisten);
		}),
	);

	return [
		remaining,
		async (seconds: number) => {
			if (seconds > 0) {
				const timestamp = Date.now() + seconds * 1000;
				// store milliseconds
				await set(key(), timestamp);
			} else {
				await remove(key());
			}
		},
	] as const;
}
