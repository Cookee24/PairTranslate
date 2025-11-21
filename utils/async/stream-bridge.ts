export type StreamBridge<T> = {
	iterator: AsyncGenerator<T>;
	push(value: T): void;
	close(): void;
	fail(error: unknown): void;
};

export const createStreamBridge = <T = string>(): StreamBridge<T> => {
	const queue: T[] = [];
	const waiters: Array<{
		resolve: (value: IteratorResult<T>) => void;
		reject: (reason?: unknown) => void;
	}> = [];
	let closed = false;
	let failure: unknown;

	const flush = () => {
		if (failure !== undefined) {
			while (waiters.length > 0) {
				waiters.shift()?.reject(failure);
			}
			return;
		}
		if (!closed || queue.length > 0) return;
		while (waiters.length > 0) {
			waiters.shift()?.resolve({ value: undefined, done: true });
		}
	};

	const iterator: AsyncGenerator<T> = {
		async next() {
			if (failure !== undefined) {
				const error = failure;
				failure = undefined;
				throw error;
			}
			if (queue.length > 0) {
				const value = queue.shift();
				return { value: value as T, done: false };
			}
			if (closed) {
				return { value: undefined, done: true };
			}
			return await new Promise<IteratorResult<T>>((resolve, reject) => {
				waiters.push({ resolve, reject });
			});
		},
		async return() {
			closed = true;
			flush();
			return { value: undefined, done: true };
		},
		async throw(error?: unknown) {
			failure = error ?? new Error("Stream cancelled");
			closed = true;
			flush();
			return Promise.reject(failure);
		},
		[Symbol.asyncIterator]() {
			return this;
		},
		async [Symbol.asyncDispose]() {
			closed = true;
			flush();
		},
	};

	return {
		iterator,
		push(value) {
			if (closed || failure !== undefined) return;
			if (waiters.length > 0) {
				waiters.shift()?.resolve({ value, done: false });
				return;
			}
			queue.push(value);
		},
		close() {
			closed = true;
			flush();
		},
		fail(error: unknown) {
			failure = error;
			closed = true;
			flush();
		},
	};
};
