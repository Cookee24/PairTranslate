import "~/utils/rpc/wxt-def";
import App from "./App";

waitRpc()
	.then(() => import("solid-js/web"))
	.then(({ render }) => {
		render(App, document.body);
	});
