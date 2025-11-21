import { createTokenBucket } from "~/utils/flow-control/token-bucket";
import type { StreamChunk } from "~/utils/llm";
import type { TranslateQueueStatus } from "~/utils/types";

export type QueueLimits = {
	requestConcurrency: number;
	tokensPerMinute: number;
};

export type UnaryResult<T> = {
	value: T;
	completionTokens: number;
};

type StreamHandle = {
	iterator: AsyncGenerator<StreamChunk>;
	completion: Promise<number>;
};

export type UnaryRunner<T> = () => Promise<UnaryResult<T>>;
export type StreamRunner = () => Promise<StreamHandle>;

type PendingTask =
	| {
			kind: "unary";
			estimatedTokens: number;
			run: UnaryRunner<unknown>;
			resolve: (value: unknown) => void;
			reject: (reason: unknown) => void;
	  }
	| {
			kind: "stream";
			estimatedTokens: number;
			run: StreamRunner;
			onReady: (iterator: AsyncGenerator<StreamChunk>) => void;
			reject: (reason: unknown) => void;
	  };

export type ModelQueue = {
	updateLimits(next: QueueLimits): void;
	status(): TranslateQueueStatus;
	enqueueUnary<T>(runner: UnaryRunner<T>, estimatedTokens: number): Promise<T>;
	enqueueStream(
		runner: StreamRunner,
		estimatedTokens: number,
	): Promise<AsyncGenerator<StreamChunk>>;
};

export const createModelQueue = (
	modelId: string,
	limits: QueueLimits,
	notify: (status: TranslateQueueStatus) => void,
): ModelQueue => {
	const bucket = createTokenBucket(limits.tokensPerMinute);
	const pending: PendingTask[] = [];
	let running = 0;
	let currentLimits = limits;
	let tokenTimer: ReturnType<typeof setTimeout> | undefined;

	const status = (): TranslateQueueStatus => ({
		modelId,
		queued: pending.length,
		running,
		tokensAvailable: Math.floor(bucket.available()),
		tokensPerMinute: currentLimits.tokensPerMinute,
		requestConcurrency: currentLimits.requestConcurrency,
	});

	const emit = () => {
		notify(status());
	};

	const finish = (additionalTokens: number) => {
		running = Math.max(0, running - 1);
		if (additionalTokens > 0) {
			bucket.forceConsume(additionalTokens);
		}
		emit();
		process();
	};

	const waitForTokens = (tokens: number) => {
		const delay = bucket.msUntil(tokens);
		if (tokenTimer || delay <= 0) return;
		tokenTimer = setTimeout(
			() => {
				tokenTimer = undefined;
				process();
			},
			Math.min(delay, 5000),
		);
	};

	const process = () => {
		while (pending.length > 0) {
			if (running >= currentLimits.requestConcurrency) return;
			const task = pending[0];
			if (!bucket.consume(task.estimatedTokens)) {
				waitForTokens(task.estimatedTokens);
				return;
			}

			pending.shift();
			running += 1;
			emit();

			if (task.kind === "unary") {
				task
					.run()
					.then((result) => {
						task.resolve(result.value);
						const extra = Math.max(
							0,
							(result.completionTokens ?? task.estimatedTokens) -
								task.estimatedTokens,
						);
						finish(extra);
					})
					.catch((error) => {
						task.reject(error);
						finish(0);
					});
			} else {
				task
					.run()
					.then(({ iterator, completion }) => {
						task.onReady(iterator);
						completion
							.then((tokens) => {
								const extra = Math.max(
									0,
									(tokens ?? task.estimatedTokens) - task.estimatedTokens,
								);
								finish(extra);
							})
							.catch((error) => {
								task.reject(error);
								finish(0);
							});
					})
					.catch((error) => {
						task.reject(error);
						finish(0);
					});
			}
		}
	};

	return {
		updateLimits(next) {
			currentLimits = next;
			bucket.update(next.tokensPerMinute);
			emit();
			process();
		},
		status,
		enqueueUnary(runner, estimatedTokens) {
			return new Promise((resolve, reject) => {
				pending.push({
					kind: "unary",
					estimatedTokens,
					run: runner as UnaryRunner<unknown>,
					resolve: resolve as (value: unknown) => void,
					reject: reject as (reason: unknown) => void,
				});
				emit();
				process();
			});
		},
		enqueueStream(runner, estimatedTokens) {
			return new Promise((resolve, reject) => {
				pending.push({
					kind: "stream",
					estimatedTokens,
					run: runner,
					onReady: resolve,
					reject: reject as (reason: unknown) => void,
				});
				emit();
				process();
			});
		},
	};
};
