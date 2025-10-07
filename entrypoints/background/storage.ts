/** biome-ignore-all lint/style/noNonNullAssertion: Checked */
/**
 * Defines the composite key structure.
 * For undefined keys, use an empty ArrayBuffer.
 */
export type Key = ArrayBuffer | string | undefined;

/**
 * Interface for Storage instance returned by createIndexedDBStore
 *
 * @template TSchema The schema of the store, defining the types for each key.
 */
export interface Storage<TSchema> {
	/**
	 * Opens and initializes the IndexedDB database.
	 *
	 * @returns A promise that resolves when the database is ready.
	 */
	open(): Promise<void>;

	/**
	 * Retrieves a value from the store based on its composite key.
	 *
	 * @param key The composite key. Use `undefined` for the default key.
	 * @returns A promise that resolves with the stored value, or undefined if not found.
	 */
	get<K extends keyof TSchema & string>(
		key: Key,
	): Promise<TSchema[K] | undefined>;

	/**
	 * Adds or updates a value in the store.
	 *
	 * @param key The composite key. Use `undefined` for the default key.
	 * @param value The value to be stored.
	 * @returns A promise that resolves when the operation is complete.
	 */
	set<K extends keyof TSchema & string>(
		key: Key,
		value: TSchema[K],
	): Promise<void>;

	/**
	 * Deletes a value from the store based on its composite key.
	 *
	 * @param key The composite key. Use `undefined` for the default key.
	 * @returns A promise that resolves when the operation is complete.
	 */
	delete(key: Key): Promise<void>;

	/**
	 * Closes the database connection and cleans up listeners.
	 */
	close(): void;
}

/**
 * Creates an IndexedDBStore instance with the given configuration.
 *
 * @template TSchema The schema of the store, defining the types for each key.
 * @param dbName The name of the database (default: "kv-store")
 * @param storeName The name of the object store (default: "main")
 * @returns An Storage instance
 */
export function createIndexedDBStore<TSchema>(
	dbName: string = "kv-store",
	storeName: string = "main",
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

	const get = async <K extends keyof TSchema & string>(
		key: Key,
	): Promise<TSchema[K] | undefined> => {
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
				resolve(request.result as TSchema[K] | undefined);
			};

			request.onerror = () => {
				reject(new Error("Failed to retrieve data from IndexedDB."));
			};
		});
	};

	const set = async <K extends keyof TSchema & string>(
		key: Key,
		value: TSchema[K],
	): Promise<void> => {
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
		delete: del,
		close,
	};
}
