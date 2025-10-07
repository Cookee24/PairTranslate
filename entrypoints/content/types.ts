export interface Position {
	x: number;
	y: number;
}

export interface SelectEvent {
	selection: Selection;
	position: Position;
}

export interface PopupOptions {
	position?: Position;
	width?: number;
	height?: number;
	pinned?: boolean;
}

export interface PopupInstance {
	id: string;
	x: number;
	y: number;
	pinned?: boolean;
	visible?: boolean;
	width: number;
	height: number;
}
