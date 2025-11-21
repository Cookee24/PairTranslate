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

const DEFAULT_CHANNEL = "pair-translate:iframe-rpc";
const IFRAME_MARKER = "data-pt-iframe-backend";

export interface IframeClientOptions {
	iframeUrl: string;
	channel?: string;
}

export interface IframeServerOptions {
	channel?: string;
	logger?: Logger;
}

const iframeCache = new Map<string, Promise<HTMLIFrameElement>>();

const ensureIframe = (src: string): Promise<HTMLIFrameElement> => {
	const cached = iframeCache.get(src);
	if (cached) {
		return cached;
	}
	if (typeof document === "undefined") {
		throw new Error("Iframe RPC transport requires a DOM environment.");
	}

	const iframe = document.createElement("iframe");
	iframe.src = src;
	iframe.setAttribute("aria-hidden", "true");
	iframe.setAttribute("tabindex", "-1");
	iframe.setAttribute(IFRAME_MARKER, src);
	iframe.setAttribute("allow", "autoplay");
	Object.assign(iframe.style, {
		position: "fixed",
		width: "0px",
		height: "0px",
		opacity: "0",
		pointerEvents: "none",
		border: "0",
	});

	const mountTarget = document.body ?? document.documentElement;
	if (!mountTarget) {
		throw new Error("Unable to mount iframe backend: no document element.");
	}
	mountTarget.appendChild(iframe);

	const promise = new Promise<HTMLIFrameElement>((resolve, reject) => {
		const cleanup = () => {
			iframe.removeEventListener("load", onLoad);
			iframe.removeEventListener("error", onError);
		};
		const onLoad = () => {
			cleanup();
			resolve(iframe);
		};
		const onError = () => {
			cleanup();
			iframe.remove();
			reject(new Error(`Failed to load iframe backend at ${src}`));
		};
		iframe.addEventListener("load", onLoad, { once: true });
		iframe.addEventListener("error", onError, { once: true });
	});

	iframeCache.set(src, promise);
	promise.catch(() => {
		iframeCache.delete(src);
	});
	return promise;
};

const createMessagePortTransportation = <M, P, E>(
	port: MessagePort,
): Transportation<M, P, E> => {
	let recvCallback: (message: Message<M, P, E>) => void = () => {};
	let closeCallback: (reason: string, error?: Error) => void = () => {};
	let isClosed = false;

	const close = (reason: string, error?: Error) => {
		if (isClosed) return;
		isClosed = true;
		try {
			port.close();
		} catch {
			// Ignore errors when closing.
		}
		closeCallback(reason, error);
	};

	port.addEventListener("message", (event) => {
		recvCallback(event.data as Message<M, P, E>);
	});

	port.addEventListener("messageerror", (event) => {
		const err =
			event.data instanceof Error
				? event.data
				: new Error("MessagePort communication failed.");
		close("MessagePort encountered an error.", err);
	});

	port.start();

	return {
		onRecv(callback: (message: Message<M, P, E>) => void) {
			recvCallback = callback;
		},
		onClose(callback: (reason: string, error?: Error) => void) {
			closeCallback = callback;
		},
		send(input: NoMetaMessage<M, P, E>) {
			if (isClosed) {
				throw new Closed("Failed to send message: port is closed.");
			}
			try {
				port.postMessage(input);
			} catch (error) {
				close("Failed to send message across MessagePort.", error as Error);
				throw new Closed(
					"Failed to send message: port is disconnected.",
					error as Error,
				);
			}
		},
		dispose() {
			close("Transport disposed by user.");
		},
	};
};

export function createIframeClientTransportBuilder<M, E>(
	options: IframeClientOptions,
): TransportBuilder<M, unknown, E> {
	const channel = options.channel ?? DEFAULT_CHANNEL;

	return async () => {
		const iframe = await ensureIframe(options.iframeUrl);
		const contentWindow = iframe.contentWindow;
		if (!contentWindow) {
			throw new Error("Iframe backend contentWindow is not available.");
		}

		const messageChannel = new MessageChannel();
		const transport = createMessagePortTransportation<M, unknown, E>(
			messageChannel.port1,
		);
		contentWindow.postMessage({ channel, type: "connect" }, "*", [
			messageChannel.port2,
		]);

		return transport;
	};
}

export function setupIframeServer<
	T extends RpcService,
	P extends unknown[],
	M = unknown,
	E = unknown,
>(implementation: Server<T>, options?: IframeServerOptions): void {
	const channel = options?.channel ?? DEFAULT_CHANNEL;
	const logger =
		options?.logger ?? createLogger(import.meta.env.DEV ? "debug" : "error");

	window.addEventListener("message", (event) => {
		if (
			!event.data ||
			typeof event.data !== "object" ||
			event.data.channel !== channel ||
			event.data.type !== "connect"
		) {
			return;
		}

		if (event.source !== window.parent) {
			logger.warn("Rejected iframe RPC connection from unknown source.");
			return;
		}

		const [port] = event.ports;
		if (!port) {
			logger.warn("Iframe RPC connection missing MessagePort.");
			return;
		}

		logger.info("Iframe RPC client connected.");
		const transport = createMessagePortTransportation<M, P, E>(port);
		createServer(transport, implementation, logger);
	});
}
