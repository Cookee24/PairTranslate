// Using wxt/browser allows for cross-browser compatibility (Chrome, Firefox, etc.)
import { browser } from "wxt/browser";
import {
	Closed,
	type Message,
	type NoMetaMessage,
	type Transportation,
	type TransportBuilder,
} from "./core";
import type { RpcService, Server } from "./factory";
import { createServer } from "./factory";
import { createLogger, type Logger } from "./logger";

/**
 * Creates a Transportation implementation using a browser.runtime.Port for
 * long-lived connections between different parts of a web extension.
 */
export function createWxtPortTransportation<M, P, E>(
	port: Browser.runtime.Port,
): Transportation<M, P, E> {
	let onRecvCallback: (message: Message<M, P, E>) => void = () => {};
	let onCloseCallback: (reason: string, error?: Error) => void = () => {};
	let isClosed = false;

	const close = (reason: string, error?: Error): void => {
		if (isClosed) return;
		isClosed = true;
		onCloseCallback(reason, error);
	};

	port.onMessage.addListener((message) => {
		// It's crucial to validate or cast the message if its structure isn't guaranteed.
		onRecvCallback(message as Message<M, P, E>);
	});

	port.onDisconnect.addListener(() => {
		if (browser.runtime.lastError) {
			close("Port disconnected.", new Error(browser.runtime.lastError.message));
		} else {
			close("Port disconnected.");
		}
	});

	return {
		onRecv(callback: (message: Message<M, P, E>) => void): void {
			onRecvCallback = callback;
		},

		onClose(callback: (reason: string, error?: Error) => void): void {
			onCloseCallback = callback;
		},

		send(input: NoMetaMessage<M, P, E>): void {
			if (isClosed) {
				throw new Closed("Failed to send message: Port is already closed.");
			}
			try {
				port.postMessage(input);
			} catch (error) {
				// This error is thrown by the browser if the port is disconnected.
				close("Port disconnected during send.", error as Error);
				throw new Closed(
					"Failed to send message: Port is disconnected.",
					error as Error,
				);
			}
		},

		dispose() {
			// A user-initiated disconnect.
			if (isClosed) return;
			close("Transport disposed by user.");
			port.disconnect();
		},
	};
}

/**
 * Creates a TransportBuilder for the client side of the connection (e.g., a content script or popup).
 * This implementation automatically handles reconnection when a page is restored from the back-forward cache (bcache).
 *
 * @param connectionName - A unique name to identify the RPC service, allowing the server to distinguish between different connection types.
 * @returns A `TransportBuilder` to be used with `StateController.create`.
 *
 * @example
 * // In a content script or UI entrypoint
 * const connection = createWxtClientTransportBuilder('my-api-service');
 * const controller = await StateController.create(connection, {});
 * const client = createClient<MyApi>(controller);
 * const result = await client.someMethod("hello");
 */
export function createWxtClientTransportBuilder<M, E>(
	connectionName: string,
): TransportBuilder<M, unknown, E> {
	return async () => {
		let port = browser.runtime.connect({ name: connectionName });

		let onRecvCallback: (message: Message<M, unknown, E>) => void = () => {};
		let onCloseCallback: (reason: string, error?: Error) => void = () => {};
		let isClosed = false; // Tracks if the user intentionally disposed of the transport
		let isReconnecting = false; // Tracks if we are in the middle of a bcache reconnect

		const setupPort = (p: Browser.runtime.Port) => {
			const onDisconnect = () => {
				if (browser.runtime.lastError) {
					// Ignore errors, the port is likely already dead.
					// Do nothing here, just make chrome not to complain.
				}
				// Detach the listener to prevent it from firing again on this port instance.
				p.onDisconnect.removeListener(onDisconnect);
				// If this is an expected disconnection (user dispose or bcache reconnect), do nothing.
				if (isClosed || isReconnecting) {
					return;
				}
				// Otherwise, it's an unexpected disconnect, so we notify the consumer.
				onCloseCallback("Port disconnected unexpectedly.");
			};

			p.onMessage.addListener((message) => {
				if (browser.runtime.lastError) {
					// Per Chrome's documentation, if an error occurred, the port will be disconnected soon.
					// We can just ignore it and let the onDisconnect handler deal with it.
				} else {
					onRecvCallback(message as Message<M, unknown, E>);
				}
			});

			p.onDisconnect.addListener(onDisconnect);
		};

		setupPort(port);

		// Handle page restoration from back-forward cache (bcache)
		window.addEventListener("pageshow", (event) => {
			if (event.persisted) {
				// The page has been restored from bcache, and the existing port is no longer valid.
				// We need to create a new connection transparently.
				isReconnecting = true;

				// Disconnecting the old port might throw an error if it's already disconnected,
				// so we wrap it in a try-catch block.
				try {
					port.disconnect();
				} catch (_e) {
					// Ignore errors, the port is likely already dead.
				}

				// Create a new port and set it up.
				port = browser.runtime.connect({ name: connectionName });
				setupPort(port);

				isReconnecting = false;
			}
		});

		return {
			onRecv(callback: (message: Message<M, unknown, E>) => void): void {
				onRecvCallback = callback;
			},

			onClose(callback: (reason: string, error?: Error) => void): void {
				onCloseCallback = callback;
			},

			send(input: NoMetaMessage<M, unknown, E>): void {
				if (isClosed) {
					throw new Closed("Failed to send message: Port is already closed.");
				}
				try {
					// This closure captures the `port` variable. When `port` is reassigned
					// during a bcache restore, this `send` function will automatically
					// use the new, valid port.
					port.postMessage(input);
				} catch (error) {
					// This error typically means the port was disconnected.
					isClosed = true; // Prevent further sends
					onCloseCallback("Port disconnected during send.", error as Error);
					throw new Closed(
						"Failed to send message: Port is disconnected.",
						error as Error,
					);
				}
			},

			dispose() {
				if (isClosed) return;
				isClosed = true;
				// Use a different reason for user-initiated disposal.
				onCloseCallback("Transport disposed by user.");
				port.disconnect();
			},
		};
	};
}

/**
 * Sets up a listener in the background script to handle incoming RPC connections.
 * For each new client connection, it spawns a new server instance.
 *
 * @param implementation - The server-side implementation of the RPC service.
 * @param logger - A logger instance for logging server events.
 * @param connectionName - The unique name that clients will use to connect to this service. Must match the name used in `createWxtClientTransportBuilder`.
 *
 * @example
 * // In your background script entrypoint
 * const myApiImpl: Server<MyApi> = { ... };
 * const logger = createLogger('info');
 * setupWxtServer(myApiImpl, logger, 'my-api-service');
 */
export function setupWxtServer<
	T extends RpcService,
	P extends unknown[],
	M = unknown,
	E = unknown,
>(
	implementation: Server<T>,
	connectionName: string,
	logger: Logger = createLogger(import.meta.env.DEV ? "debug" : "error"),
): void {
	browser.runtime.onConnect.addListener((port) => {
		// Only handle connections that match the specified service name.
		if (port.name === connectionName) {
			logger.info(`New client connected to '${connectionName}' service.`);
			const transport = createWxtPortTransportation<M, P, E>(port);
			// The `createServer` function will now handle the lifecycle of this single connection.
			createServer(transport, implementation, logger);
		}
	});

	logger.info(
		`RPC server listener setup for '${connectionName}' in background script.`,
	);
}
