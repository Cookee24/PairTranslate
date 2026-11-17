import "~/utils/rpc/wxt-def";
import { untilAlive } from "~/utils/alive";
import { isAndroid } from "~/utils/isandroid";
import { waitRpc } from "~/utils/rpc/wxt-def";
import App from "./App";

if (isAndroid()) document.documentElement.classList.add("android");

untilAlive()
	.then(() => waitRpc())
	.then(() => import("solid-js/web"))
	.then(({ render }) => {
		render(App, document.body);
	});
