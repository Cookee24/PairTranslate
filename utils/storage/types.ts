export type Key = IDBValidKey;

export interface Storage<TSchema> {
	open(): Promise<void>;
	get(key: Key): Promise<TSchema | undefined>;
	set(key: Key, value: TSchema): Promise<void>;
	del(key: Key): Promise<void>;
	clear(): Promise<void>;
	close(): void;
}
