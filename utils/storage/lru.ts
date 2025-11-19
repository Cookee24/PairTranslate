import type { Key } from "./types";

export function createLRUStorage<TSchema>(
	dbName: string = "pair-translate",
	storeName: string,
	maxSize: number,
) {
	let db: IDBDatabase | null = null;
	const usageStoreName = `__${storeName}_usage`;

	const open = (): Promise<void> => {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(dbName, 1);

			request.onupgradeneeded = (event) => {
				const targetDb = (event.target as IDBOpenDBRequest).result;
				if (!targetDb.objectStoreNames.contains(storeName)) {
					targetDb.createObjectStore(storeName);
				}
				if (!targetDb.objectStoreNames.contains(usageStoreName)) {
					const usageStore = targetDb.createObjectStore(usageStoreName, {
						keyPath: "key",
					});
					usageStore.createIndex("lastUsed", "lastUsed", { unique: false });
				}
			};

			request.onsuccess = (event) => {
				db = (event.target as IDBOpenDBRequest).result;
				resolve();
			};

			request.onerror = (event) => {
				reject((event.target as IDBOpenDBRequest).error);
			};
		});
	};

	// Helper to remove a single item (used by set)
	const evict = async (): Promise<void> => {
		await open();
		return new Promise((resolve, reject) => {
			if (!db) {
				return reject(new Error("Database not open."));
			}

			const transaction = db.transaction(
				[storeName, usageStoreName],
				"readwrite",
			);
			const dataStore = transaction.objectStore(storeName);
			const usageStore = transaction.objectStore(usageStoreName);
			const usageIndex = usageStore.index("lastUsed");

			const openCursorRequest = usageIndex.openCursor();

			openCursorRequest.onsuccess = (event) => {
				const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
				if (cursor) {
					const lruKey = cursor.value.key;
					dataStore.delete(lruKey);
					usageStore.delete(lruKey);
				}
				resolve();
			};

			openCursorRequest.onerror = () => {
				reject(openCursorRequest.error);
			};
		});
	};

	const get = async (key: Key): Promise<TSchema | undefined> => {
		await open();
		return new Promise((resolve, reject) => {
			if (!db) {
				return reject(new Error("Database not open."));
			}

			const transaction = db.transaction(
				[storeName, usageStoreName],
				"readwrite",
			);
			const dataStore = transaction.objectStore(storeName);
			const usageStore = transaction.objectStore(usageStoreName);
			const getRequest = dataStore.get(key);

			getRequest.onsuccess = () => {
				const result = getRequest.result;
				if (result) {
					usageStore.put({ key, lastUsed: Date.now() });
				}
				resolve(result);
			};

			transaction.onerror = () => reject(transaction.error);
			getRequest.onerror = () => reject(getRequest.error);
		});
	};

	const set = async (key: Key, value: TSchema): Promise<void> => {
		await open();
		return new Promise((resolve, reject) => {
			if (!db) {
				return reject(new Error("Database not open."));
			}

			const transaction = db.transaction(
				[storeName, usageStoreName],
				"readwrite",
			);
			const dataStore = transaction.objectStore(storeName);
			const usageStore = transaction.objectStore(usageStoreName);

			dataStore.put(value, key);
			usageStore.put({ key, lastUsed: Date.now() });

			const countRequest = dataStore.count();

			countRequest.onsuccess = () => {
				if (countRequest.result > maxSize) {
					// Eviction is chained to the transaction completion
					transaction.oncomplete = () => {
						evict().then(resolve).catch(reject);
					};
				} else {
					transaction.oncomplete = () => resolve();
				}
			};

			countRequest.onerror = () => reject(countRequest.error);
			transaction.onerror = () => reject(transaction.error);
		});
	};

	const resize = async (newSize: number): Promise<void> => {
		// Update the closure variable so future sets respect the new limit
		if (maxSize === newSize) return;
		maxSize = newSize;

		await open();
		return new Promise((resolve, reject) => {
			if (!db) {
				return reject(new Error("Database not open."));
			}

			const transaction = db.transaction(
				[storeName, usageStoreName],
				"readwrite",
			);
			const dataStore = transaction.objectStore(storeName);
			const usageStore = transaction.objectStore(usageStoreName);
			const usageIndex = usageStore.index("lastUsed");

			// 1. Check current count
			const countRequest = dataStore.count();

			countRequest.onsuccess = () => {
				const currentCount = countRequest.result;
				let excess = currentCount - maxSize;

				if (excess <= 0) {
					// No eviction needed, let transaction complete
					return;
				}

				// 2. Iterate through oldest items and delete them
				const cursorRequest = usageIndex.openCursor();

				cursorRequest.onsuccess = (event) => {
					const cursor = (event.target as IDBRequest<IDBCursorWithValue>)
						.result;

					// As long as we have excess items and a valid cursor
					if (cursor && excess > 0) {
						const lruKey = cursor.value.key;

						// Delete data and usage entry
						dataStore.delete(lruKey);
						cursor.delete(); // Removes from usageStore efficiently

						excess--;
						cursor.continue(); // Move to next oldest
					}
				};

				cursorRequest.onerror = () => reject(cursorRequest.error);
			};

			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
			countRequest.onerror = () => reject(countRequest.error);
		});
	};

	const del = async (key: Key): Promise<void> => {
		await open();
		return new Promise((resolve, reject) => {
			if (!db) {
				return reject(new Error("Database not open."));
			}

			const transaction = db.transaction(
				[storeName, usageStoreName],
				"readwrite",
			);
			const dataStore = transaction.objectStore(storeName);
			const usageStore = transaction.objectStore(usageStoreName);

			dataStore.delete(key);
			usageStore.delete(key);

			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
	};

	const clear = async (): Promise<void> => {
		await open();
		return new Promise((resolve, reject) => {
			if (!db) {
				return reject(new Error("Database not open."));
			}

			const transaction = db.transaction(
				[storeName, usageStoreName],
				"readwrite",
			);
			const dataStore = transaction.objectStore(storeName);
			const usageStore = transaction.objectStore(usageStoreName);

			dataStore.clear();
			usageStore.clear();

			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
	};

	const close = (): void => {
		if (db) {
			db.close();
			db = null;
		}
	};

	return {
		open,
		get,
		set,
		del,
		clear,
		close,
		resize,
	};
}
