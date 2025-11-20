import { createEffect, createSignal, onCleanup } from "solid-js";
import { useSettings } from "~/hooks/settings";
import { selectionListener } from "../selection";
import type { SelectEvent } from "../types";
import Tip from "./Tip";

export default () => {
	const [selectEvent, setSelectionEvent] = createSignal<SelectEvent>();
	const { settings } = useSettings();

	createEffect(async () => {
		if (settings.basic.enabled && settings.basic.selectionPopupEnabled) {
			const listener = selectionListener();
			onCleanup(() => listener.return());
			for await (const event of listener) {
				setSelectionEvent(event);
			}
		}
	});

	return <Tip event={selectEvent()} />;
};
