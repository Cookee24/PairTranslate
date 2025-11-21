import { WXT_TRANSPORTATION_NAME } from "~/utils/constants";
import type { AllServices } from "~/utils/rpc";
import { createStateController } from "~/utils/rpc/core";
import type { Client } from "~/utils/rpc/factory";
import { createClient } from "~/utils/rpc/factory";
import { createWxtClientTransportBuilder } from "~/utils/rpc/wxt";

const _getRpcClient = async () => {
	const builder = createWxtClientTransportBuilder(WXT_TRANSPORTATION_NAME);
	const controller = await createStateController(builder);
	return createClient<AllServices>(controller);
};

export const waitRpc = async (): Promise<void> => {
	if (!window.rpc) {
		window.rpc = await _getRpcClient();
	}
};

declare global {
	interface Window {
		rpc: Client<AllServices>;
	}
}
