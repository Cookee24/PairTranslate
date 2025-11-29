import { createEffect, createSignal, onCleanup } from "solid-js";
import { createElementObserver } from "@/hooks/observer";
import { useSettings } from "~/hooks/settings";
import { useWebsiteRule } from "~/hooks/website-rule";
import { BatchInTextTranslation } from "../native-components/InTextTranslate";
import { getDomListener } from "../parser";

export default () => {
	const { settings } = useSettings();
	const websiteRule = useWebsiteRule();

	const [elements, setElements] = createSignal(new Set<HTMLElement>(), {
		equals: false,
	});

	createEffect(() => {
		const [listenIntersectionOrRemove, listenRemove] = createElementObserver();

		const filterInteractive =
			websiteRule.filterInteractive ?? settings.translate.filterInteractive;
		const fullPage =
			websiteRule.translateFullPage ?? settings.translate.translateFullPage;
		const hostname = window.location.hostname;

		const buffer = {
			add: new Set<HTMLElement>(),
			del: new Set<HTMLElement>(),
			handle: null as number | null,
		};

		const flush = () => {
			setElements((prev) => {
				if (buffer.add.size === 0 && buffer.del.size === 0) return prev;

				for (const el of buffer.add) prev.add(el);
				for (const el of buffer.del) prev.delete(el);

				buffer.add.clear();
				buffer.del.clear();
				buffer.handle = null;

				return prev;
			});
		};

		const scheduleFlush = () => {
			if (buffer.handle !== null) return;
			buffer.handle = requestAnimationFrame(flush);
		};

		const handleAdd = (el: HTMLElement) => {
			buffer.del.delete(el);
			buffer.add.add(el);
			scheduleFlush();
		};

		const handleRemove = (el: HTMLElement) => {
			buffer.add.delete(el);
			buffer.del.add(el);
			scheduleFlush();
		};

		const controller = new AbortController();
		(async () => {
			const listener = await getDomListener(hostname, {
				filterInteractive,
				signal: controller.signal,
			});

			for await (const element of listener) {
				if (fullPage) {
					handleAdd(element);
					listenRemove(element, () => handleRemove(element));
				} else {
					listenIntersectionOrRemove(element, (shouldRender) => {
						shouldRender ? handleAdd(element) : handleRemove(element);
					});
				}
			}
		})();

		onCleanup(() => {
			controller.abort();
			if (buffer.handle !== null) cancelAnimationFrame(buffer.handle);
			setElements((prev) => {
				prev.clear();
				return prev;
			});
		});
	});

	const onDelete = (element: HTMLElement) => {
		setElements((prev) => {
			prev.delete(element);
			return prev;
		});
	};

	return <BatchInTextTranslation elements={elements()} onDelete={onDelete} />;
};
