import { onCleanup } from "solid-js";

interface Props {
	onToggle?: () => void;
}

const TAP_TIME_THRESHOLD = 300; // ms - max time between touch start and end for a tap
const TAP_DISTANCE_THRESHOLD = 30; // px - max movement allowed during tap

export default (props: Props) => {
	let touchStartTime = 0;
	let touchStartPositions: { x: number; y: number }[] = [];

	const handleTouchStart = (e: TouchEvent) => {
		// Check if exactly 4 fingers touched the screen
		if (e.touches.length === 4) {
			touchStartTime = Date.now();
			touchStartPositions = Array.from(e.touches).map((touch) => ({
				x: touch.clientX,
				y: touch.clientY,
			}));
		} else {
			// Reset if finger count changes
			touchStartTime = 0;
			touchStartPositions = [];
		}
	};

	const handleTouchEnd = (e: TouchEvent) => {
		// Only trigger when all fingers are lifted and we had a 4-finger touch
		if (e.touches.length === 0 && touchStartTime > 0) {
			const elapsed = Date.now() - touchStartTime;

			// Check if it was a quick tap (within time threshold)
			if (elapsed < TAP_TIME_THRESHOLD && e.changedTouches.length === 4) {
				// Verify fingers didn't move too much during the tap
				const endPositions = Array.from(e.changedTouches).map((touch) => ({
					x: touch.clientX,
					y: touch.clientY,
				}));

				const isValidTap = endPositions.every((endPos, index) => {
					const startPos = touchStartPositions[index];
					if (!startPos) return false;
					const dx = Math.abs(endPos.x - startPos.x);
					const dy = Math.abs(endPos.y - startPos.y);
					return dx < TAP_DISTANCE_THRESHOLD && dy < TAP_DISTANCE_THRESHOLD;
				});

				if (isValidTap) {
					props.onToggle?.();
				}
			}
		}

		// Reset state
		touchStartTime = 0;
		touchStartPositions = [];
	};

	const handleTouchCancel = () => {
		// Reset state on cancel
		touchStartTime = 0;
		touchStartPositions = [];
	};

	document.addEventListener("touchstart", handleTouchStart, {
		passive: true,
	});
	document.addEventListener("touchend", handleTouchEnd, { passive: true });
	document.addEventListener("touchcancel", handleTouchCancel, {
		passive: true,
	});

	onCleanup(() => {
		document.removeEventListener("touchstart", handleTouchStart);
		document.removeEventListener("touchend", handleTouchEnd);
		document.removeEventListener("touchcancel", handleTouchCancel);
	});

	return null;
};
