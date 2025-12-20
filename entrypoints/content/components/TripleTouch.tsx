import { createEffect, onCleanup } from "solid-js";
import { useSettings } from "~/hooks/settings";
import type { DOMSection } from "~/utils/parser/types";
import {
	type SelectionPoint,
	shouldIncludeElementAtPoint,
} from "~/utils/selection";
import { getDomListener } from "../parser";

interface Props {
	onSelection?: (sections: DOMSection[]) => void;
}

const TRIPLE_CLICK_WINDOW = 600; // ms
const TAP_DISTANCE_THRESHOLD = 30; // px

export default (props: Props) => {
	const { settings } = useSettings();

	createEffect(() => {
		if (!settings.basic.selectionTranslateEnabled) return;

		let clickCount = 0;
		let lastClickTime = 0;
		let lastClickPos: SelectionPoint | undefined;
		let resetTimer: NodeJS.Timeout | undefined;

		const handleClick = async (e: MouseEvent | TouchEvent) => {
			const now = Date.now();
			const currentPos: SelectionPoint =
				e instanceof MouseEvent
					? { x: e.clientX, y: e.clientY }
					: { x: e.touches[0]?.clientX || 0, y: e.touches[0]?.clientY || 0 };

			// Check if this click is within the time window and distance threshold
			const isWithinWindow = now - lastClickTime < TRIPLE_CLICK_WINDOW;
			const isWithinDistance =
				lastClickPos &&
				Math.abs(currentPos.x - lastClickPos.x) < TAP_DISTANCE_THRESHOLD &&
				Math.abs(currentPos.y - lastClickPos.y) < TAP_DISTANCE_THRESHOLD;

			if (isWithinWindow && isWithinDistance) {
				clickCount++;
			} else {
				clickCount = 1;
			}

			lastClickTime = now;
			lastClickPos = currentPos;

			// Clear any existing reset timer
			if (resetTimer) {
				clearTimeout(resetTimer);
			}

			// Set a timer to reset the click count
			resetTimer = setTimeout(() => {
				clickCount = 0;
				lastClickPos = undefined;
			}, TRIPLE_CLICK_WINDOW);

			// If we've detected a triple click
			if (clickCount === 3) {
				clickCount = 0;
				lastClickPos = undefined;
				clearTimeout(resetTimer);

				const sections = await elementsAtPoint(currentPos);
				props.onSelection?.(sections);
			}
		};

		const handleTouchStart = (e: TouchEvent) => {
			if (e.touches.length === 1) {
				handleClick(e);
			}
		};

		document.addEventListener("touchstart", handleTouchStart, {
			passive: true,
		});

		onCleanup(() => {
			if (resetTimer) {
				clearTimeout(resetTimer);
			}
			document.removeEventListener("touchstart", handleTouchStart);
		});
	});

	return null;
};

const elementsAtPoint = async (point: SelectionPoint) => {
	const controller = new AbortController();
	const selectionPoint = {
		x: point.x + window.scrollX,
		y: point.y + window.scrollY,
	};
	const listener = await getDomListener(window.location.hostname, {
		roots: document.elementsFromPoint(point.x, point.y),
		judgeFn: (element) => shouldIncludeElementAtPoint(element, selectionPoint),
		listenNew: false,
		filterInteractive: false,
		signal: controller.signal,
	});

	const result: DOMSection[] = [];
	(async () => {
		for await (const section of listener) {
			result.push(section);
		}
	})();

	await new Promise((r) => setTimeout(r, 200));
	controller.abort();

	return result;
};
