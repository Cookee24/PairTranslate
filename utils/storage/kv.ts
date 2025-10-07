import type { Key, Storage } from "./types";

export function createKVStore<TSchema>(
	dbName: string = "pair-translate",
	storeName: string,
): Storage<TSchema> {
	const DEFAULT_KEY = new ArrayBuffer(0);
	let db: IDBDatabase | null = null;

	const open = (): Promise<void> => {
		return new Promise((resolve, reject) => {
			if (db) {
				resolve();
				return;
			}

			const request = indexedDB.open(dbName, 1);

			request.onupgradeneeded = () => {
				const database = request.result;
				if (!database.objectStoreNames.contains(storeName)) {
					database.createObjectStore(storeName);
				}
			};

			request.onsuccess = () => {
				db = request.result;
				resolve();
			};

			request.onerror = () => {
				reject(new Error(`Failed to open IndexedDB database "${dbName}".`));
			};
		});
	};

	const get = async (key: Key): Promise<TSchema | undefined> => {
		await open(); // Ensure DB is open before proceeding
		return new Promise((resolve, reject) => {
			if (!db) {
				// This should not happen due to the await above, but it's good practice
				return reject(new Error("Database is not open."));
			}
			const transaction = db.transaction(storeName, "readonly");
			const store = transaction.objectStore(storeName);
			const request = store.get(key ?? DEFAULT_KEY);

			request.onsuccess = () => {
				resolve(request.result as TSchema | undefined);
			};

			request.onerror = () => {
				reject(new Error("Failed to retrieve data from IndexedDB."));
			};
		});
	};

	const set = async (key: Key, value: TSchema): Promise<void> => {
		await open();
		return new Promise((resolve, reject) => {
			if (!db) {
				return reject(new Error("Database is not open."));
			}
			const transaction = db.transaction(storeName, "readwrite");
			const store = transaction.objectStore(storeName);
			const request = store.put(value, key ?? DEFAULT_KEY);

			request.onsuccess = () => {
				resolve();
			};

			request.onerror = () => {
				reject(new Error("Failed to write data to IndexedDB."));
			};
		});
	};

	const del = async (key: Key): Promise<void> => {
		await open();
		return new Promise((resolve, reject) => {
			if (!db) {
				return reject(new Error("Database is not open."));
			}
			const transaction = db.transaction(storeName, "readwrite");
			const store = transaction.objectStore(storeName);
			const request = store.delete(key ?? DEFAULT_KEY);

			request.onsuccess = () => {
				resolve();
			};

			request.onerror = () => {
				reject(new Error("Failed to delete data from IndexedDB."));
			};
		});
	};

	const clear = async (): Promise<void> => {
		await open();
		return new Promise((resolve, reject) => {
			if (!db) {
				return reject(new Error("Database is not open."));
			}
			const transaction = db.transaction(storeName, "readwrite");
			const store = transaction.objectStore(storeName);
			const request = store.clear();

			request.onsuccess = () => {
				resolve();
			};

			request.onerror = () => {
				reject(new Error("Failed to clear data from IndexedDB."));
			};
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
	};
}
