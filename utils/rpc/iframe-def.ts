import { browser } from "#imports";
import { createStateController } from "~/utils/rpc/core";
import type { Client } from "~/utils/rpc/factory";
import { createClient } from "~/utils/rpc/factory";
import { createIframeClientTransportBuilder } from "~/utils/rpc/iframe";
import type { IframeServices } from "../rpc";

export const IFRAME_AUDIO_CHANNEL = "pair-translate:iframe-audio";

let clientPromise: Promise<Client<IframeServices>> | null = null;

const ensureClient = async (): Promise<Client<IframeServices>> => {
	if (!clientPromise) {
		const iframeUrl = browser.runtime.getURL("/iframe.html");
		const builder = createIframeClientTransportBuilder({
			iframeUrl,
			channel: IFRAME_AUDIO_CHANNEL,
		});
		clientPromise = createStateController(builder)
			.then((controller) => createClient<IframeServices>(controller))
			.catch((error) => {
				clientPromise = null;
				throw error;
			});
	}
	return clientPromise;
};

export const getIframeClient = async (): Promise<Client<IframeServices>> =>
	ensureClient();
