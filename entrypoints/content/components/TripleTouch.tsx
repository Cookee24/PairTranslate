import { createEffect, onCleanup } from "solid-js";
import { useSettings } from "~/hooks/settings";
import { getDomListener } from "../parser";

interface Props {
	onSelection?: (elements: HTMLElement[]) => void;
}

const TRIPLE_CLICK_WINDOW = 600; // ms
const TAP_DISTANCE_THRESHOLD = 30; // px

export default (props: Props) => {
	const { settings } = useSettings();

	createEffect(() => {
		if (!settings.basic.selectionTranslateEnabled) return;

		let clickCount = 0;
		let lastClickTime = 0;
		let lastClickPos: { x: number; y: number } | undefined;
		let resetTimer: NodeJS.Timeout | undefined;

		const handleClick = async (e: MouseEvent | TouchEvent) => {
			const now = Date.now();
			const currentPos =
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

				const elements = await elementsAtPoint(currentPos);
				props.onSelection?.(elements);
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

const elementsAtPoint = async (point: { x: number; y: number }) => {
	const controller = new AbortController();
	const listener = await getDomListener(window.location.hostname, {
		judgeFns: [
			(element) => {
				const rect = element.getBoundingClientRect();
				if (rect.width === 0 && rect.height === 0) return true;
				return (
					point.x >= rect.x &&
					point.x <= rect.x + rect.width &&
					point.y >= rect.y &&
					point.y <= rect.y + rect.height
				);
			},
		],
		listenNew: false,
		signal: controller.signal,
	});

	const result: HTMLElement[] = [];
	(async () => {
		for await (const element of listener) {
			result.push(element);
		}
	})();

	await new Promise((r) => setTimeout(r, 200));
	controller.abort();

	return result;
};
