const { promise, resolve } = Promise.withResolvers<void>();

const _getRpcClient = async () => {
	const builder = createWxtClientTransportBuilder(WXT_TRANSPORTATION_NAME);
	const controller = await createStateController(builder);
	const rpc = createClient<AllServices>(controller);

	// Make the promise resolvable.
	// I don't know why, but without returning a function here,
	// the _getRpcClient() wouldn't resolve properly.
	resolve();
	return () => rpc;
};

if (!window.rpc) {
	_getRpcClient().then((fn) => {
		window.rpc = fn();
	});
}

export const rpcReady = () => promise;

declare global {
	interface Window {
		rpc: Client<AllServices>;
	}
}
