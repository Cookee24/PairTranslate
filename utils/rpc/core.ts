/** biome-ignore-all lint/style/noNonNullAssertion: checked length */

import { t } from "~/utils/i18n";
import { createNotifier, type Notifier } from "~/utils/notify";
import { createLogger, type Logger } from "./logger";

export type RpcId = ReturnType<typeof generateId>;

export type TransportBuilder<M, T, E> = (
	options?: T,
) => Promise<Transportation<M, T, E>>;

export interface Transportation<M, T, E> {
	send(input: NoMetaMessage<M, T, E>): void;
	/** Sets a callback to be invoked for each incoming message. */
	onRecv(callback: (message: Message<M, T, E>) => void): void;
	/** Sets a callback for when the connection is terminated, either gracefully or with an error. */
	onClose(callback: (reason: string, error?: Error) => void): void;
	dispose(): void;
}

export type NoMetaMessage<M, T, E> = Omit<Message<M, T, E>, "metadata">;

export type Message<M, T, E> = {
	id: RpcId;
	metadata: M;
} & MessageBody<T, E>;

export type MessageStart<T> = {
	type: "start";
	method: string;
	payload: T;
};

export type MessageProgress<T> = {
	type: "progress";
	payload: T;
};

export type MessageEnd<T, E> = {
	type: "end";
} & ({ payload: T } | { error: E });

export type MessageCancel = {
	type: "cancel";
};

export type MessageHeartbeat = {
	type: "heartbeat";
};

export type MessageBody<T, E> =
	| MessageStart<T>
	| MessageProgress<T>
	| MessageEnd<T, E>
	| MessageHeartbeat
	| MessageCancel;

export type MessageListener<M, T, E> = (
	message: Message<M, T, E>,
) => Promise<MessageBody<T, E>> | MessageBody<T, E>;

interface IncMessageQueue<M, T, E> {
	notifier: Notifier;
	queue: Array<Message<M, T, E>>;
}

interface OutMessageQueue<M, T, E> {
	notifier: Notifier;
	queue: Array<NoMetaMessage<M, T, E>>;
}

export interface State<M, T, E> {
	transportation: Transportation<M, T, E>;
	inc: Map<RpcId, IncMessageQueue<M, T, E>>;
	out: OutMessageQueue<M, T, E>;
	logger: Logger;
}

export const generateId = () => crypto.randomUUID();

export class TransportationError extends Error {
	constructor(error: unknown) {
		if (error instanceof Error) {
			super(`Error when transporting RPC: ${error.message}`);
			this.stack = error.stack;
		} else {
			super(`Error when transporting RPC: ${String(error)}`);
		}
		this.name = "TransportationError";
	}
}

export class Closed {
	reason: string;
	cause?: Error;

	constructor(reason: string, cause?: Error) {
		this.reason = reason;
		this.cause = cause;
	}
}

export interface StateController<M, T, E> {
	readonly state: State<M, T, E>;
	dispose(): Promise<void>;
}

export async function createStateController<M, T, E>(
	transportBuilder: TransportBuilder<M, T, E>,
	logger: Logger = createLogger(import.meta.env.DEV ? "debug" : "error"),
	options?: T,
): Promise<StateController<M, T, E>> {
	const transportation = await transportBuilder(options);
	const state: State<M, T, E> = {
		transportation,
		inc: new Map(),
		out: {
			notifier: createNotifier(),
			queue: [],
		},
		logger,
	};
	let isDisposed = false;

	const initializeStreams = (): void => {
		const { logger, transportation, inc } = state;

		sendStream(state).catch((error) => {
			if (!(error instanceof Closed)) {
				state.logger.error("Send stream crashed unexpectedly.", error);
			}
			dispose(`Send stream ended: ${error.message ?? error}`);
		});

		transportation.onRecv((msg) => {
			const queue = inc.get(msg.id);
			if (queue) {
				queue.queue.push(msg);
				queue.notifier.notify();
			} else {
				// This block handles messages for which there is no active call handler.
				// This can happen in a few legitimate scenarios due to race conditions:
				// 1. On the server, receiving a 'cancel' for a call that has already finished.
				// 2. On the client, receiving 'progress' or 'end' for a call that was just
				//    cancelled, because the server sent them before processing the 'cancel' message.
				// We log these expected cases at a 'debug' level to avoid unnecessary noise.
				if (msg.type === "end" || msg.type === "progress") {
					logger.debug(
						`Received a late '${msg.type}' message for a completed or cancelled call.`,
						msg,
					);
				} else if (msg.type !== "cancel") {
					// A 'start' message with an unknown ID, or other unexpected types,
					// should still be warned about. We also ignore late 'cancel' messages.
					logger.warn("Received message with unknown id:", msg);
				}
			}
		});

		transportation.onClose((reason, error) => {
			if (error) {
				logger.error("Transport connection closed with error.", reason, error);
			} else {
				logger.info("Transport connection closed.", reason);
			}
			dispose(`Transport closed: ${reason}`);
		});
	};

	const dispose = async (
		reason: string = "User initiated dispose",
	): Promise<void> => {
		if (isDisposed) {
			return;
		}
		isDisposed = true;
		state.logger.info("Disposing transportation:", reason);

		state.out.notifier.notify();
		state.inc.forEach((val) => {
			val.notifier.notify();
		});

		state.transportation.dispose();
	};

	initializeStreams();

	return {
		state,
		dispose,
	};
}

async function sendStream<M, T, E>(state: State<M, T, E>): Promise<void> {
	const { transportation, out, logger } = state;

	try {
		while (true) {
			await out.notifier.wait();
			while (out.queue.length > 0) {
				const msg = out.queue.shift();
				if (msg) {
					transportation.send(msg);
				}
			}
		}
	} catch (error) {
		if (error instanceof Closed) {
			throw error;
		} else {
			logger.error(t("errors.rpc.streamError"), error);
			throw new TransportationError(error);
		}
	}
}

export async function* internalCall<M, T, E>(
	state: State<M, T, E>,
	generator: AsyncGenerator<NoMetaMessage<M, T, E>, void, unknown>,
	signal?: AbortSignal,
): AsyncGenerator<Message<M, T, E>> {
	const { inc, out, logger } = state;
	let id: RpcId | undefined;
	let isEnded = false;

	const sendMessage = (msg: NoMetaMessage<M, T, E>) => {
		out.queue.push(msg);
		out.notifier.notify();
	};

	try {
		const firstMessageResult = await generator.next();
		if (firstMessageResult.done) {
			return;
		}

		id = firstMessageResult.value.id;
		inc.set(id, {
			notifier: createNotifier(),
			queue: [],
		});
		sendMessage(firstMessageResult.value);

		const queue = inc.get(id)!;

		const { reject: abort, promise: aborted } = Promise.withResolvers<void>();
		aborted.catch(() => {}); // Prevent unhandled rejection
		if (signal) {
			if (signal.aborted) {
				abort(signal.reason);
			} else {
				const onAbort = () =>
					abort(signal.reason || new DOMException("Aborted", "AbortError"));

				signal.addEventListener("abort", onAbort);
				aborted.finally(() => signal.removeEventListener("abort", onAbort));
			}
		}

		while (true) {
			const sendPromise = generator.next();
			const recvPromise = queue.notifier.wait();

			const winner = await Promise.race([sendPromise, recvPromise, aborted]);

			if (winner && typeof winner === "object" && "done" in winner) {
				const sendResult = winner as IteratorResult<NoMetaMessage<M, T, E>>;
				if (sendResult.done) {
					break;
				}
				sendMessage(sendResult.value);
			} else {
				while (queue.queue.length > 0) {
					yield queue.queue.shift()!;
				}
			}
		}

		while (true) {
			while (queue.queue.length > 0) {
				const msg = queue.queue.shift()!;
				if (msg.type === "end") {
					isEnded = true;
				}
				yield msg;
				if (isEnded) {
					return;
				}
			}
			await Promise.race([queue.notifier.wait(), aborted]);
		}
	} catch (error) {
		if (signal?.aborted) {
			logger.debug(`[${id!}] Aborted.`);
		} else if (error instanceof Closed) {
			logger.info(
				"Transport closed during an active call.",
				error.reason,
				error.cause,
			);
		} else {
			throw error;
		}
	} finally {
		if (!isEnded) {
			logger.debug(
				`[${id!}] Call cancelled by client, sending 'cancel' message.`,
			);
			sendMessage({ id: id!, type: "cancel" });
		}
		inc.delete(id!);
		generator.return();
	}
}
