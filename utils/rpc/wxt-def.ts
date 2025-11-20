import { WXT_TRANSPORTATION_NAME } from "~/utils/constants";
import type { AllServices } from "~/utils/rpc";
import { createStateController } from "~/utils/rpc/core";
import type { Client } from "~/utils/rpc/factory";
import { createClient } from "~/utils/rpc/factory";
import { createWxtClientTransportBuilder } from "~/utils/rpc/wxt";

const _getRpcClient = async () => {
	const builder = createWxtClientTransportBuilder(WXT_TRANSPORTATION_NAME);
	const controller = await createStateController(builder);
	const rpc = createClient<AllServices>(controller);

	// Make the promise resolvable.
	// I don't know why, but without returning a function here,
	// the _getRpcClient() wouldn't resolve properly.
	return () => rpc;
};

export const waitRpc = async (): Promise<void> => {
	if (!window.rpc) {
		await _getRpcClient().then((getRpc) => {
			window.rpc = getRpc();
		});
	}
};

declare global {
	interface Window {
		rpc: Client<AllServices>;
	}
}
