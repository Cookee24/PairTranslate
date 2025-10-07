import { GripHorizontal, Pin, X } from "lucide-solid";
import type { JSX, ParentComponent } from "solid-js";
import {
	createContext,
	createEffect,
	createSignal,
	For,
	on,
	onCleanup,
	useContext,
} from "solid-js";
import { createStore } from "solid-js/store";
import type { PopupOptions, Position } from "../types";

const DEFAULT_STATE = {
	x: 0,
	y: 0,
	pinned: false,
	visible: true,
	width: 320,
	height: 480,
	dragging: false,
	resizing: false,
	zIndex: 1000,
};

const createPopupStore = (
	id: string,
	getZIndex: () => number,
	options?: PopupOptions,
) => {
	const [state, setState] = createStore({
		x: options?.position?.x || DEFAULT_STATE.x,
		y: options?.position?.y || DEFAULT_STATE.y,
		width: options?.width || DEFAULT_STATE.width,
		height: options?.height || DEFAULT_STATE.height,
		pinned: options?.pinned || DEFAULT_STATE.pinned,
		visible: DEFAULT_STATE.visible,
		dragging: DEFAULT_STATE.dragging,
		resizing: DEFAULT_STATE.resizing,
		zIndex: getZIndex(),
		id,
	});

	const actions = {
		togglePin: () => {
			setState("pinned", (pinned) => !pinned);
		},

		setVisibility: (visible: boolean) => {
			setState("visible", visible);
		},

		startDrag: () => {
			setState("dragging", true);
		},

		endDrag: () => {
			setState("dragging", false);
		},

		startResize: () => {
			setState("resizing", true);
		},

		endResize: () => {
			setState("resizing", false);
		},

		updatePosition: (x: number, y: number) => {
			setState("x", x);
			setState("y", y);
		},

		updateSize: (width: number, height: number) => {
			setState("width", width);
			setState("height", height);
		},

		bringToFront: () => {
			setState("zIndex", getZIndex());
		},
	};

	return { state, actions };
};

type PopupStore = ReturnType<typeof createPopupStore>;
export type PopupState = PopupStore["state"];
export type PopupActions = PopupStore["actions"];

export interface PopupRegistry {
	stores: Map<string, PopupStore>;
	elements: Map<string, () => JSX.Element>;
}

export interface PopupContextType {
	// Registry functions
	createPopup: (element: () => JSX.Element, options?: PopupOptions) => string;
	removePopup: (id: string) => void;
	getPopupIds: () => string[];

	// Individual store access
	getPopupStore: (id: string) => [PopupState, PopupActions] | undefined;
	getPopupElement: (id: string) => (() => JSX.Element) | undefined;
}

const PopupContext = createContext<PopupContextType>();

export const PopupProvider: ParentComponent = (props) => {
	const [registry, setRegistry] = createSignal<PopupRegistry>(
		{
			stores: new Map(),
			elements: new Map(),
		},
		{ equals: false },
	);

	let zCounter = 1000;

	createEffect(() => {
		if (registry().stores.size === 0) {
			zCounter = 1000;
		}
	});

	const getZIndex = () => zCounter++;

	const contextValue: PopupContextType = {
		createPopup: (element: () => JSX.Element, options?: PopupOptions) => {
			const id = `popup-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
			const store = createPopupStore(id, getZIndex, options);

			setRegistry((reg) => {
				reg.stores.set(id, store);
				reg.elements.set(id, element);
				return reg;
			});

			return id;
		},

		removePopup: (id: string) => {
			setRegistry((reg) => {
				reg.stores.delete(id);
				reg.elements.delete(id);
				return reg;
			});
		},

		getPopupIds: () => {
			return Array.from(registry().stores.keys());
		},

		getPopupStore: (id: string) => {
			const store = registry().stores.get(id);
			if (!store) return undefined;
			return [store.state, store.actions];
		},

		getPopupElement: (id: string) => {
			return registry().elements.get(id);
		},
	};

	return (
		<PopupContext.Provider value={contextValue}>
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

interface PopupComponentProps {
	id: string;
}

export const PopupComponent = (props: PopupComponentProps) => {
	const { getPopupStore, getPopupElement, removePopup } = usePopup();
	const popupStore = getPopupStore(props.id);
	const element = getPopupElement(props.id);

	if (!popupStore || !element) {
		return null;
	}

	const [state, actions] = popupStore;

	const [ready, setReady] = createSignal(false);
	const [ref, setRef] = createSignal<HTMLDivElement>();
	const shouldRender = createAnimatedAppearance(ref, [
		ready,
		() => state.visible,
	]);

	const updatePositionBounds = () => {
		const { innerWidth, innerHeight } = window;
		const leastX = 64;
		const leastY = 64;
		return {
			minX: leastX - state.width,
			maxX: innerWidth - leastX,
			minY: Math.max(0, leastY - state.height),
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

	createEffect(
		on(shouldRender, (rendering) => {
			if (!rendering && !state.visible) {
				removePopup(props.id);
			}
		}),
	);

	const onBringToFront = () => {
		actions.bringToFront();
	};

	onOuterClick(
		ref,
		() => actions.setVisibility(false),
		() => !state.pinned && state.visible,
	);

	let dragRef: HTMLDivElement | undefined;

	createEffect(
		on(
			() => [state.dragging, state.resizing],
			([dragging, resizing]) => {
				const ref_ = ref();
				if (!ref_) return;
				if (dragging || resizing) {
					animateLift(ref_);
				} else {
					animateDown(ref_);
				}
			},
		),
	);

	// Mouse event handlers
	const onDragStart = (e: MouseEvent) => {
		if (!ref) return;
		e.preventDefault();
		actions.startDrag();

		document.addEventListener("mousemove", onDragMove);
		document.addEventListener("mouseup", onDragEnd);
	};

	const onDragMove = (e: MouseEvent) => {
		e.preventDefault();
		const bounds = positionBounds();

		actions.updatePosition(
			Math.max(bounds.minX, Math.min(state.x + e.movementX, bounds.maxX)),
			Math.max(bounds.minY, Math.min(state.y + e.movementY, bounds.maxY)),
		);
	};

	const onDragEnd = () => {
		actions.endDrag();
		document.removeEventListener("mousemove", onDragMove);
		document.removeEventListener("mouseup", onDragEnd);
	};

	// Touch event handlers for dragging
	const onTouchDragStart = (e: TouchEvent) => {
		if (!ref || e.touches.length !== 1) return;
		e.preventDefault();

		const touch = e.touches[0];
		lastTouch = { x: touch.clientX, y: touch.clientY };
		actions.startDrag();

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

		actions.updatePosition(
			Math.max(bounds.minX, Math.min(state.x + movementX, bounds.maxX)),
			Math.max(bounds.minY, Math.min(state.y + movementY, bounds.maxY)),
		);

		lastTouch = { x: touch.clientX, y: touch.clientY };
	};

	const onTouchDragEnd = () => {
		actions.endDrag();
		lastTouch = null;
		document.removeEventListener("touchmove", onTouchDragMove);
		document.removeEventListener("touchend", onTouchDragEnd);
		document.removeEventListener("touchcancel", onTouchDragEnd);
	};

	// Mouse event handlers for resizing
	const onResizeStart = (e: MouseEvent) => {
		e.preventDefault();
		actions.startResize();
		document.addEventListener("mousemove", onResizeMove);
		document.addEventListener("mouseup", onResizeEnd);
	};

	const onResizeMove = (e: MouseEvent) => {
		e.preventDefault();
		actions.updateSize(
			Math.max(200, state.width + e.movementX),
			Math.max(150, state.height + e.movementY),
		);
	};

	const onResizeEnd = () => {
		actions.endResize();
		document.removeEventListener("mousemove", onResizeMove);
		document.removeEventListener("mouseup", onResizeEnd);
	};

	// Touch event handlers for resizing
	const onTouchResizeStart = (e: TouchEvent) => {
		if (e.touches.length !== 1) return;
		e.preventDefault();

		const touch = e.touches[0];
		lastTouch = { x: touch.clientX, y: touch.clientY };
		actions.startResize();

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

		actions.updateSize(
			Math.max(200, state.width + movementX),
			Math.max(150, state.height + movementY),
		);

		lastTouch = { x: touch.clientX, y: touch.clientY };
	};

	const onTouchResizeEnd = () => {
		actions.endResize();
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

	createEffect(() => {
		const ref_ = ref();
		if (!ref_) return;
		ref_.style.width = `${state.width}px`;
		ref_.style.height = `${state.height}px`;
		ref_.style.left = `${state.x}px`;
		ref_.style.top = `${state.y}px`;
		ref_.style.zIndex = `${state.zIndex}`;
		setReady(true);
	});

	return (
		<div
			ref={setRef}
			class="fixed bg-base-200/90 backdrop-blur-md text-base-content rounded-lg pt-0 shadow-md shadow-base-200 flex flex-col"
			hidden={!shouldRender()}
			onMouseDown={onBringToFront}
			onTouchStart={onBringToFront}
		>
			<div class="w-full h-6 rounded-t-lg bg-primary/90 backdrop-blur-md text-primary-content flex items-center justify-center relative">
				<div
					ref={dragRef}
					class="absolute inset-0 flex justify-center items-center touch-none"
					classList={{
						"cursor-grabbing": state.dragging,
						"cursor-grab": !state.dragging,
					}}
					onMouseDown={onDragStart}
					onTouchStart={onTouchDragStart}
				>
					<GripHorizontal class="color-base-content" size={16} />
				</div>
				<Button
					class="z-10 rounded-none rounded-tl-lg"
					variant={state.pinned ? "success" : "ghost"}
					size="xs"
					onClick={actions.togglePin}
				>
					<Pin size={16} />
				</Button>
				<div class="flex-1" />
				<Button
					class="z-10 rounded-none rounded-tr-lg"
					variant="ghost"
					size="xs"
					onClick={() => actions.setVisibility(false)}
				>
					<X size={16} />
				</Button>
			</div>
			<div class="overflow-y-auto">{element()}</div>
			<button
				type="button"
				class="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize touch-none"
				onMouseDown={onResizeStart}
				onTouchStart={onTouchResizeStart}
			>
				<ResizeIcon />
			</button>
		</div>
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

export const PopupRenderer = () => {
	const { getPopupIds, getPopupStore, getPopupElement } = usePopup();

	return (
		<For each={getPopupIds()}>
			{(id) => {
				const popupStore = getPopupStore(id);
				const element = getPopupElement(id);
				if (!popupStore || !element) return null;
				return <PopupComponent id={id} />;
			}}
		</For>
	);
};

export const clampPosition = (
	pos: Position,
	size: { width: number; height: number } = {
		width: DEFAULT_STATE.width,
		height: DEFAULT_STATE.height,
	},
) => {
	const { innerWidth, innerHeight } = window;
	return {
		x: Math.max(0, Math.min(pos.x, innerWidth - size.width - 10)),
		y: Math.max(0, Math.min(pos.y, innerHeight - size.height - 10)),
	};
};

export default PopupProvider;
