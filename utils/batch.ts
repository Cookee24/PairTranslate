export interface BatchOptions {
	batchSize: number;
	batchTimeoutMs: number;
}

const TIMEOUT_SYMBOL = Symbol("timeout");

export async function* batchAsyncGenerator<T>(
	source: AsyncGenerator<T>,
	options: BatchOptions,
): AsyncGenerator<T[]> {
	const { batchSize, batchTimeoutMs } = options;

	let currentBatch: T[] = [];

	const sourceIterator = source[Symbol.asyncIterator]();

	try {
		while (true) {
			const promisesToRace: Promise<
				IteratorResult<T> | typeof TIMEOUT_SYMBOL
			>[] = [sourceIterator.next()];

			if (currentBatch.length > 0) {
				const timeoutPromise = new Promise<typeof TIMEOUT_SYMBOL>((resolve) => {
					setTimeout(() => resolve(TIMEOUT_SYMBOL), batchTimeoutMs);
				}).then();
				promisesToRace.push(timeoutPromise);
			}

			const winner = await Promise.race(promisesToRace);

			if (winner === TIMEOUT_SYMBOL) {
				yield currentBatch;
				currentBatch = [];
				continue;
			}

			const nextItemResult = winner;

			if (nextItemResult.done) {
				if (currentBatch.length > 0) {
					yield currentBatch;
				}
				return;
			}

			currentBatch.push(nextItemResult.value);

			if (currentBatch.length >= batchSize) {
				yield currentBatch;
				currentBatch = [];
			}
		}
	} finally {
		source.return?.(undefined);
	}
}

export const nextFrameWithIdle = (timeout = 300) =>
	new Promise((resolve) =>
		requestIdleCallback(() => requestAnimationFrame(resolve), { timeout }),
	);
