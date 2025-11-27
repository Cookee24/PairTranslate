/** biome-ignore-all lint/suspicious/noExplicitAny: any is needed for rpc factory */
import {
	generateId,
	internalCall,
	type Message,
	type MessageStart,
	type NoMetaMessage,
	type RpcId,
	type StateController,
	type Transportation,
} from "./core";
import type { Logger } from "./logger";

/**
 * Represents a single method on an RPC service.
 * It can be a standard async function (unary) or an async generator (streaming).
 * The method will receive an AbortSignal as its last argument to handle cancellation.
 */
export type RpcMethod =
	| ((...args: any[]) => Promise<any>)
	| ((...args: any[]) => AsyncGenerator<any, any, any>);

/**
 * A collection of RPC methods that defines a service.
 */
export type RpcService = {
	[method: string]: RpcMethod;
};

/**
 * Represents the server-side implementation of an RPC service.
 * Method signatures must account for an optional metadata object and
 * a final AbortSignal argument provided by the server.
 * e.g. `(payloadArg1, payloadArg2, metadata, signal) => ...`
 */
export type Server<T extends RpcService> = T;

export type RpcCallable<A extends any[], U, S> = (
	...args: A
) => Promise<U> & AsyncIterable<S>;

export type Client<T extends RpcService> = {
	[K in keyof T]: T[K] extends (...args: infer A) => Promise<infer R>
		? (...args: [...A, AbortSignal?]) => Promise<R>
		: T[K] extends (...args: infer A) => AsyncGenerator<infer Y, any, any>
			? (...args: [...A, AbortSignal?]) => AsyncGenerator<Y, void, unknown>
			: never;
};

export function createClient<
	T extends RpcService,
	M = unknown,
	P = unknown,
	E = unknown,
>(stateController: StateController<M, P, E>): Client<T> {
	const proxy: any = new Proxy(
		{},
		{
			get(_target, prop, _receiver) {
				if (prop === "then") return undefined; // Allow await on the proxy itself
				const method = String(prop);
				return (...payload: unknown[]) => {
					const { state } = stateController;
					const id = generateId();

					let abortSignal: AbortSignal | undefined;
					if (
						payload.length > 0 &&
						payload[payload.length - 1] instanceof AbortSignal
					) {
						abortSignal = payload.pop() as AbortSignal;
					}

					const startGenerator = (async function* () {
						yield {
							id,
							type: "start",
							method,
							payload,
						} as NoMetaMessage<M, P, E>;
					})();

					const responseMessages = internalCall(
						state,
						startGenerator,
						abortSignal,
					);

					let promise: Promise<unknown> | null = null;

					return {
						// biome-ignore lint/suspicious/noThenProperty: For unary calls
						then: (
							resolve: (value: unknown) => void,
							reject: (reason?: any) => void,
						) => {
							if (!promise) {
								promise = (async () => {
									for await (const msg of responseMessages) {
										if (msg.type === "progress") {
											// Do nothing, wait for 'end'
										} else if (msg.type === "end") {
											if ("error" in msg) {
												throw msg.error;
											}
											return msg.payload;
										}
									}
									return undefined;
								})();
							}
							return promise.then(resolve, reject);
						},
						[Symbol.asyncIterator]: async function* () {
							for await (const msg of responseMessages) {
								if (msg.type === "progress") {
									yield msg.payload;
								} else if (msg.type === "end") {
									if ("error" in msg) {
										throw msg.error;
									}
									return;
								}
							}
						},
						return: (val?: unknown) => responseMessages.return(val),
						throw: (error: E) => responseMessages.throw(error),
					};
				};
			},
		},
	);

	return proxy as Client<T>;
}

/**
 * Creates and runs an RPC server that handles incoming requests.
 */
export function createServer<
	T extends RpcService,
	P extends unknown[],
	M = unknown,
	E = unknown,
>(
	transport: Transportation<M, P, E>,
	implementation: Server<T>,
	logger: Logger,
): void {
	logger.info("Server starting...");
	// Map to track ongoing requests and their cancellation controllers.
	const activeRequests = new Map<RpcId, AbortController>();

	const handleRequest = async (
		startMessage: Message<M, P, E> & MessageStart<P>,
	): Promise<void> => {
		const { id, method, payload, metadata } = startMessage;
		logger.debug(`[${id}] Received request for method: ${method}`);

		const controller = new AbortController();
		activeRequests.set(id, controller);

		try {
			const methodImpl = implementation[method];

			if (!methodImpl) {
				const error = `Method '${method}' not found.`;
				logger.error(`[${id}] ${error}`);
				transport.send({
					id,
					type: "end",
					error: { message: error },
				} as NoMetaMessage<M, P, E>);
				return;
			}

			// Pass metadata and the abort signal as the final arguments.
			const result = methodImpl(...payload, metadata, controller.signal);

			if (result instanceof Promise) {
				const finalPayload = await result;
				transport.send({
					id,
					type: "end",
					payload: finalPayload,
				} as NoMetaMessage<M, P, E>);
			} else {
				for await (const progressPayload of result) {
					// Before sending progress, check if the client has cancelled.
					if (controller.signal.aborted) {
						logger.info(`[${id}] Method '${method}' aborted by client.`);
						// The generator should have already stopped, but we break just in case.
						break;
					}
					transport.send({
						id,
						type: "progress",
						payload: progressPayload,
					} as NoMetaMessage<M, P, E>);
				}
				transport.send({ id, type: "end" });
			}
			logger.debug(`[${id}] Finished request for method: ${method}`);
		} catch (err) {
			// Don't report errors caused by client-side cancellation.
			if (
				!(err instanceof Error && err.name === "AbortError") &&
				!controller.signal.aborted
			) {
				logger.error(`[${id}] Error executing method '${method}':`, err);
				transport.send({
					id,
					type: "end",
					error: err,
				} as NoMetaMessage<M, P, E>);
			}
		} finally {
			// Clean up the controller from the map once the request is complete.
			activeRequests.delete(id);
		}
	};

	const interval = setInterval(() => {
		transport.send({ type: "heartbeat" } as NoMetaMessage<M, P, E>);
	}, 30000);

	transport.onRecv((msg) => {
		if (msg.type === "start") {
			handleRequest(msg as Message<M, P, E> & MessageStart<P>).catch(
				(error) => {
					logger.error("Unhandled error in request handler:", error);
				},
			);
		} else if (msg.type === "cancel") {
			const controller = activeRequests.get(msg.id);
			if (controller) {
				logger.debug(`[${msg.id}] Received 'cancel' message, aborting.`);
				controller.abort();
				activeRequests.delete(msg.id);
			}
		} else {
			logger.warn(
				"Server received a message that was not of type 'start' or 'cancel':",
				msg,
			);
		}
	});

	transport.onClose((reason, error) => {
		const message = "Server transport connection closed.";
		if (error) {
			logger.error(message, reason, error);
		} else {
			logger.info(message, reason);
		}

		// Abort all active requests when the connection is lost.
		activeRequests.forEach((controller) => {
			controller.abort();
		});
		activeRequests.clear();
		clearInterval(interval);
	});
}
