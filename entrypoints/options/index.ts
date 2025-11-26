import "~/utils/rpc/wxt-def";
import { untilAlive } from "~/utils/alive";
import { waitRpc } from "~/utils/rpc/wxt-def";
import App from "./App";

untilAlive()
	.then(() => waitRpc())
	.then(() => import("solid-js/web"))
	.then(({ render }) => {
		render(App, document.body);
	});
