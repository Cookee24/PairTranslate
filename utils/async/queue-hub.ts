import {
	createModelQueue,
	type ModelQueue,
	type QueueLimits,
} from "~/utils/flow-control/model-queue";
import type { TranslateQueueStatus } from "~/utils/types";

type QueueFactory = (
	modelId: string,
	limits: QueueLimits,
	notify: (status: TranslateQueueStatus) => void,
) => ModelQueue;

export type QueueHubOptions = {
	createQueue?: QueueFactory;
};

export type QueueHub = {
	queue(modelId: string): ModelQueue;
	refresh(): void;
	subscribe(modelId: string): AsyncGenerator<TranslateQueueStatus>;
};

export const createQueueHub = (
	limits: (modelId: string) => QueueLimits,
	options?: QueueHubOptions,
): QueueHub => {
	const queueFactory = options?.createQueue ?? createModelQueue;
	const queues = new Map<string, ModelQueue>();
	const subscribers = new Map<
		string,
		Set<(status: TranslateQueueStatus) => void>
	>();

	const getQueue = (modelId: string): ModelQueue => {
		let queue = queues.get(modelId);
		if (!queue) {
			queue = queueFactory(modelId, limits(modelId), (status) => {
				subscribers.get(modelId)?.forEach((listener) => {
					listener(status);
				});
			});
			queues.set(modelId, queue);
		}
		return queue;
	};

	return {
		queue: getQueue,
		refresh() {
			queues.forEach((queue, modelId) => {
				queue.updateLimits(limits(modelId));
			});
		},
		subscribe(modelId) {
			const queue = getQueue(modelId);
			const listeners = subscribers.get(modelId) ?? new Set();
			subscribers.set(modelId, listeners);

			return (async function* generator(initial: TranslateQueueStatus) {
				let resolver: ((status: TranslateQueueStatus) => void) | null = null;
				let last: TranslateQueueStatus | null = null;

				const listener = (status: TranslateQueueStatus) => {
					if (resolver) {
						const resolve = resolver;
						resolver = null;
						resolve(status);
						return;
					}
					last = status;
				};

				listeners.add(listener);

				yield initial;
				try {
					while (true) {
						if (last) {
							const next = last;
							last = null;
							yield next;
							continue;
						}
						const nextStatus = await new Promise<TranslateQueueStatus>(
							(resolve) => {
								resolver = resolve;
							},
						);
						yield nextStatus;
					}
				} finally {
					listeners.delete(listener);
				}
			})(queue.status());
		},
	};
};
