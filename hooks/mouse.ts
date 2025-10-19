export function useMousePosition() {
	const [pos, setPos] = createSignal({ x: 0, y: 0 });

	const handleMouseMove = (event: MouseEvent) => {
		setPos({ x: event.clientX, y: event.clientY });
	};

	onMount(() => {
		document.addEventListener("mousemove", handleMouseMove, { passive: true });
		onCleanup(() => {
			document.removeEventListener("mousemove", handleMouseMove);
		});
	});

	return pos;
}
