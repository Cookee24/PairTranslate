import { GripHorizontal, Pin, X } from "lucide-solid";
import type { JSX } from "solid-js";
import type { SetStoreFunction, Store } from "solid-js/store";

const DEFAULT_STATE = {
	x: 12,
	y: 12,
	width: 320,
	height: 480,
	pinned: false,
	visible: true,
	zIndex: 0,
	content: () => <></>,
};
type PopupState = typeof DEFAULT_STATE;

export interface PopupActions {
	togglePin: () => void;
	close: () => void;
	setPosition: (x: number, y: number) => void;
	setSize: (width: number, height: number) => void;
}

let cnt = 0;

export interface PopupContext {
	addPopup: (state?: Partial<PopupState>) => PopupActions;
	popups: Store<PopupState[]>;
	setPopups: SetStoreFunction<PopupState[]>;
}
const PopupContext = createContext<PopupContext>();

export const PopupProvider = (props: { children: JSX.Element }) => {
	const [popups, setPopups] = createStore([] as PopupState[]);

	const value: PopupContext = {
		addPopup: (inputState) => {
			const lastIdx = popups.length;
			const [state, setState] = createStore<PopupState>({
				...DEFAULT_STATE,
				...inputState,
				zIndex: ++cnt,
			});
			setPopups(lastIdx, state);

			return {
				togglePin: () => setState("pinned", (p) => !p),
				close: () => setState("visible", false),
				setPosition: (x: number, y: number) => setState({ x, y }),
				setSize: (width: number, height: number) => setState({ width, height }),
			};
		},
		popups,
		setPopups,
	};

	return (
		<PopupContext.Provider value={value}>
			{props.children}
		</PopupContext.Provider>
	);
};

export const usePopup = () => {
	const context = useContext(PopupContext);
	if (!context) {
		throw new Error("usePopup must be used within a PopupProvider");
	}

	return context;
};

export const PopupRenderer = () => {
	const { popups, setPopups } = usePopup();

	return (
		<For each={popups}>
			{(popup, index) => (
				<PopupImpl
					onDelete={() => {
						const index_ = index();
						setPopups((p) => p.filter((_, i) => i !== index_));
					}}
					onBringToFront={() => {
						setPopups(index(), "zIndex", ++cnt);
					}}
					// @ts-ignore This should be fine on most cases
					setState={(...args) => setPopups(index(), ...args)}
					{...popup}
				/>
			)}
		</For>
	);
};

interface ImplProps extends PopupState {
	onDelete: () => void;
	onBringToFront: () => void;
	setState: SetStoreFunction<PopupState>;
}
const PopupImpl = (props: ImplProps) => {
	const [ref, setRef] = createSignal<HTMLDivElement>();
	const shouldRender = createAnimatedAppearance(ref, () => props.visible);
	createEffect(
		on(
			shouldRender,
			(rendering) => {
				if (!rendering) {
					props.onDelete();
				}
			},
			{ defer: true },
		),
	);

	let dragRef: HTMLDivElement | undefined;

	const updatePositionBounds = () => {
		const { innerWidth, innerHeight } = window;
		const leastX = 64;
		const leastY = 64;
		return {
			minX: leastX - props.width,
			maxX: innerWidth - leastX,
			minY: Math.max(0, leastY - props.height),
			maxY: innerHeight - leastY,
		};
	};
	const [positionBounds, setPositionBounds] = createSignal(
		updatePositionBounds(),
	);

	onMount(() => {
		const handler = () => setPositionBounds(updatePositionBounds);
		handler();
		window.addEventListener("resize", handler, { passive: true });
		onCleanup(() => window.removeEventListener("resize", handler));
	});

	// Track last touch position for movement calculations
	let lastTouch: { x: number; y: number } | null = null;

	onOuterClick(
		ref,
		() => props.setState("visible", false),
		() => !props.pinned && props.visible,
	);

	const [dragging, setDragging] = createSignal(false);
	const [resizing, setResizing] = createSignal(false);
	createEffect(
		on([dragging, resizing], ([dragging_, resizing_]) => {
			const ref_ = ref();
			if (!ref_) return;
			if (dragging_ || resizing_) {
				animateLift(ref_);
			} else {
				animateDown(ref_);
			}
		}),
	);

	// Mouse event handlers
	const onDragStart = (e: MouseEvent) => {
		if (!ref) return;
		e.preventDefault();
		setDragging(true);

		document.addEventListener("mousemove", onDragMove);
		document.addEventListener("mouseup", onDragEnd);
	};

	const onDragMove = (e: MouseEvent) => {
		e.preventDefault();
		const bounds = positionBounds();

		props.setState({
			x: Math.max(bounds.minX, Math.min(props.x + e.movementX, bounds.maxX)),
			y: Math.max(bounds.minY, Math.min(props.y + e.movementY, bounds.maxY)),
		});
	};

	const onDragEnd = () => {
		setDragging(false);
		document.removeEventListener("mousemove", onDragMove);
		document.removeEventListener("mouseup", onDragEnd);
	};

	// Touch event handlers for dragging
	const onTouchDragStart = (e: TouchEvent) => {
		if (!ref || e.touches.length !== 1) return;
		e.preventDefault();

		const touch = e.touches[0];
		lastTouch = { x: touch.clientX, y: touch.clientY };
		setDragging(true);

		document.addEventListener("touchmove", onTouchDragMove, { passive: false });
		document.addEventListener("touchend", onTouchDragEnd);
		document.addEventListener("touchcancel", onTouchDragEnd);
	};

	const onTouchDragMove = (e: TouchEvent) => {
		if (!lastTouch || e.touches.length !== 1) return;
		e.preventDefault();

		const touch = e.touches[0];
		const last = lastTouch;
		const movementX = touch.clientX - last.x;
		const movementY = touch.clientY - last.y;
		const bounds = positionBounds();

		props.setState({
			x: Math.max(bounds.minX, Math.min(props.x + movementX, bounds.maxX)),
			y: Math.max(bounds.minY, Math.min(props.y + movementY, bounds.maxY)),
		});

		lastTouch = { x: touch.clientX, y: touch.clientY };
	};

	const onTouchDragEnd = () => {
		setDragging(false);
		lastTouch = null;
		document.removeEventListener("touchmove", onTouchDragMove);
		document.removeEventListener("touchend", onTouchDragEnd);
		document.removeEventListener("touchcancel", onTouchDragEnd);
	};

	// Mouse event handlers for resizing
	const onResizeStart = (e: MouseEvent) => {
		e.preventDefault();
		setResizing(true);
		document.addEventListener("mousemove", onResizeMove);
		document.addEventListener("mouseup", onResizeEnd);
	};

	const onResizeMove = (e: MouseEvent) => {
		e.preventDefault();
		props.setState({
			width: Math.max(200, props.width + e.movementX),
			height: Math.max(150, props.height + e.movementY),
		});
	};

	const onResizeEnd = () => {
		setResizing(false);
		document.removeEventListener("mousemove", onResizeMove);
		document.removeEventListener("mouseup", onResizeEnd);
	};

	// Touch event handlers for resizing
	const onTouchResizeStart = (e: TouchEvent) => {
		if (e.touches.length !== 1) return;
		e.preventDefault();

		const touch = e.touches[0];
		lastTouch = { x: touch.clientX, y: touch.clientY };
		setResizing(true);

		document.addEventListener("touchmove", onTouchResizeMove, {
			passive: false,
		});
		document.addEventListener("touchend", onTouchResizeEnd);
		document.addEventListener("touchcancel", onTouchResizeEnd);
	};

	const onTouchResizeMove = (e: TouchEvent) => {
		if (!lastTouch || e.touches.length !== 1) return;
		e.preventDefault();

		const touch = e.touches[0];
		const last = lastTouch;
		const movementX = touch.clientX - last.x;
		const movementY = touch.clientY - last.y;

		props.setState({
			width: Math.max(200, props.width + movementX),
			height: Math.max(150, props.height + movementY),
		});

		lastTouch = { x: touch.clientX, y: touch.clientY };
	};

	const onTouchResizeEnd = () => {
		setResizing(false);
		lastTouch = null;
		document.removeEventListener("touchmove", onTouchResizeMove);
		document.removeEventListener("touchend", onTouchResizeEnd);
		document.removeEventListener("touchcancel", onTouchResizeEnd);
	};

	onCleanup(() => {
		// Mouse cleanup
		document.removeEventListener("mousemove", onDragMove);
		document.removeEventListener("mouseup", onDragEnd);
		document.removeEventListener("mousemove", onResizeMove);
		document.removeEventListener("mouseup", onResizeEnd);

		// Touch cleanup
		document.removeEventListener("touchmove", onTouchDragMove);
		document.removeEventListener("touchend", onTouchDragEnd);
		document.removeEventListener("touchcancel", onTouchDragEnd);
		document.removeEventListener("touchmove", onTouchResizeMove);
		document.removeEventListener("touchend", onTouchResizeEnd);
		document.removeEventListener("touchcancel", onTouchResizeEnd);
	});

	return (
		<Show when={shouldRender()}>
			<div
				ref={setRef}
				class="fixed bg-base-200/90 backdrop-blur-md text-base-content rounded-lg pt-0 shadow-md shadow-base-200 flex flex-col"
				onMouseDown={props.onBringToFront}
				onTouchStart={props.onBringToFront}
				style={{
					top: `${props.y}px`,
					left: `${props.x}px`,
					width: `${props.width}px`,
					height: `${props.height}px`,
					"z-index": props.zIndex,
				}}
			>
				<div class="w-full h-6 rounded-t-lg bg-primary/90 backdrop-blur-md text-primary-content flex items-center justify-center relative">
					<div
						ref={dragRef}
						class="absolute inset-0 flex justify-center items-center touch-none"
						classList={{
							"cursor-grabbing": dragging(),
							"cursor-grab": !dragging(),
						}}
						onMouseDown={onDragStart}
						onTouchStart={onTouchDragStart}
					>
						<GripHorizontal class="color-base-content" size={16} />
					</div>
					<Button
						class="z-10 rounded-none rounded-tl-lg"
						variant={props.pinned ? "success" : "ghost"}
						size="xs"
						onClick={() => props.setState("pinned", (p) => !p)}
					>
						<Pin size={16} />
					</Button>
					<div class="flex-1" />
					<Button
						class="z-10 rounded-none rounded-tr-lg"
						variant="ghost"
						size="xs"
						onClick={() => props.setState("visible", false)}
					>
						<X size={16} />
					</Button>
				</div>
				<div class="overflow-y-auto">{props.content()}</div>
				<button
					type="button"
					class="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize touch-none"
					onMouseDown={onResizeStart}
					onTouchStart={onTouchResizeStart}
				>
					<ResizeIcon />
				</button>
			</div>
		</Show>
	);
};

const ResizeIcon = () => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="w-full h-full opacity-50"
		>
			<title>{t("common.resize")}</title>
			<line x1="20" y1="14" x2="14" y2="20" />
			<line x1="15" y1="9" x2="9" y2="15" />
		</svg>
	);
};
