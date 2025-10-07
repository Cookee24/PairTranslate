export type TaskStatus = "pending" | "running" | "completed" | "failed";

export type Task<T = unknown, R = unknown> = {
	id: string;
	fn: () => Promise<R>;
	data?: T;
	status: TaskStatus;
	result?: R;
	error?: Error;
	attempts: number;
	maxRetries: number;
	createdAt: number;
	startedAt?: number;
	completedAt?: number;
};

export type TaskOptions = {
	maxRetries?: number;
	data?: unknown;
};

export type TaskQueueOptions = {
	maxConcurrent?: number;
	retryDelay?: number;
};

export type TaskEventType = "started" | "completed" | "failed" | "retry";

export type TaskEvent<T = unknown, R = unknown> = {
	type: TaskEventType;
	task: Task<T, R>;
	timestamp: number;
};

export type TaskEventListener<T = unknown, R = unknown> = (
	event: TaskEvent<T, R>,
) => void;
