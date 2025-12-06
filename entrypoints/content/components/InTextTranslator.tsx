import { createEffect, createSignal, onCleanup } from "solid-js";
import { createNodeObserver } from "@/hooks/observer";
import { useSettings } from "~/hooks/settings";
import { useWebsiteRule } from "~/hooks/website-rule";
import type { DOMSection } from "~/utils/parser/types";
import { BatchInTextTranslation } from "../native-components/InTextTranslate";
import { getDomListener } from "../parser";

export default () => {
	const { settings } = useSettings();
	const websiteRule = useWebsiteRule();

	const [sections, setSections] = createSignal(new Set<DOMSection>(), {
		equals: false,
	});

	createEffect(() => {
		const [listenIntersectionOrRemove, listenRemove] = createNodeObserver();

		const filterInteractive =
			websiteRule.filterInteractive ?? settings.translate.filterInteractive;
		const fullPage =
			websiteRule.translateFullPage ?? settings.translate.translateFullPage;
		const hostname = window.location.hostname;

		const buffer = {
			add: new Set<DOMSection>(),
			del: new Set<DOMSection>(),
			handle: null as number | null,
		};

		const flush = () => {
			setSections((prev) => {
				if (buffer.add.size === 0 && buffer.del.size === 0) return prev;

				for (const section of buffer.add) prev.add(section);
				for (const section of buffer.del) prev.delete(section);

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

		const handleAdd = (section: DOMSection) => {
			buffer.del.delete(section);
			buffer.add.add(section);
			scheduleFlush();
		};

		const handleRemove = (section: DOMSection) => {
			buffer.add.delete(section);
			buffer.del.add(section);
			scheduleFlush();
		};

		const controller = new AbortController();
		(async () => {
			const listener = await getDomListener(hostname, {
				filterInteractive,
				signal: controller.signal,
			});

			for await (const section of listener) {
				if (fullPage) {
					handleAdd(section);
					listenRemove(section[0], () => handleRemove(section));
				} else {
					listenIntersectionOrRemove(section[0], (shouldRender) => {
						shouldRender ? handleAdd(section) : handleRemove(section);
					});
				}
			}
		})();

		onCleanup(() => {
			controller.abort();
			if (buffer.handle !== null) cancelAnimationFrame(buffer.handle);
			setSections((prev) => {
				prev.clear();
				return prev;
			});
		});
	});

	const onDelete = (section: DOMSection) => {
		setSections((prev) => {
			prev.delete(section);
			return prev;
		});
	};

	return <BatchInTextTranslation sections={sections()} onDelete={onDelete} />;
};
