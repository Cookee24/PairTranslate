export function createSessionStorage<T>() {
	return {
		set(key: string, value: T): Promise<void> {
			return browser.storage.session.set({ [key]: value });
		},
		async get(key: string): Promise<T | undefined> {
			const result = await browser.storage.session.get(key);
			return result[key] as T | undefined;
		},
		remove(key: string): Promise<void> {
			return browser.storage.session.remove(key);
		},
		listen(key: string, callback: (value: T | undefined) => void) {
			browser.storage.session.get(key, (res) => {
				const value = res[key] as T | undefined;
				callback(value);
			});

			const listener = (changes: {
				[key: string]: Browser.storage.StorageChange;
			}) => {
				const storageChange = changes[key];
				if (storageChange) {
					callback(storageChange.newValue as T | undefined);
				}
			};
			browser.storage.session.onChanged.addListener(listener);
			return () => browser.storage.session.onChanged.removeListener(listener);
		},
	};
}
