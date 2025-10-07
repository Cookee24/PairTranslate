export function createNotifier<T = void, E = unknown>() {
	let promise: Promise<T>;
	let resolve: (value: T) => void;
	let reject: (reason?: E) => void;

	function reset() {
		({ promise, resolve, reject } = Promise.withResolvers<T>());
	}

	reset();

	return {
		notify(value: T) {
			resolve(value);
			reset();
		},
		throw(reason?: E) {
			reject(reason);
			reset();
		},
		wait(): Promise<T> {
			return promise;
		},
	};
}

export type Notifier<T = void, E = unknown> = ReturnType<
	typeof createNotifier<T, E>
>;
