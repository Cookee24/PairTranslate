import type {
	Task,
	TaskEventListener,
	TaskEventType,
	TaskOptions,
	TaskQueueOptions,
} from "./types";

export function createTaskQueue(options: TaskQueueOptions = {}) {
	const tasks = new Map<string, Task>();
	const running = new Set<string>();
	const listeners = new Map<TaskEventType, Set<TaskEventListener>>();
	const maxConcurrent = options.maxConcurrent ?? 3;
	const retryDelay = options.retryDelay ?? 1000;

	const generateId = (): string => {
		return `task_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
	};

	const calculateRetryDelay = (attempt: number): number => {
		return Math.min(retryDelay * 2 ** (attempt - 1), 30000);
	};

	const emit = <T = unknown, R = unknown>(
		type: TaskEventType,
		task: Task<T, R>,
	): void => {
		const eventListeners = listeners.get(type);
		if (eventListeners) {
			const event = { type, task, timestamp: Date.now() };
			for (const listener of eventListeners) {
				try {
					listener(event);
				} catch (error) {
					console.error("Task event listener error:", error);
				}
			}
		}
	};

	const executeTask = async (task: Task): Promise<void> => {
		running.add(task.id);
		task.status = "running";
		task.startedAt = Date.now();
		task.attempts++;

		emit("started", task);

		try {
			const result = await task.fn();
			task.result = result;
			task.status = "completed";
			task.completedAt = Date.now();
			emit("completed", task);
		} catch (error) {
			task.error = error as Error;

			if (task.attempts < task.maxRetries) {
				task.status = "pending";
				emit("retry", task);
				const delay = calculateRetryDelay(task.attempts);
				setTimeout(() => processNext(), delay);
			} else {
				task.status = "failed";
				task.completedAt = Date.now();
				emit("failed", task);
			}
		} finally {
			running.delete(task.id);
			processNext();
		}
	};

	const getPending = (): Task[] => {
		return Array.from(tasks.values()).filter(
			(task) => task.status === "pending",
		);
	};

	const processNext = async (): Promise<void> => {
		if (running.size >= maxConcurrent) {
			return;
		}

		const pendingTask = getPending()[0];
		if (!pendingTask) {
			return;
		}

		await executeTask(pendingTask);
	};

	const add = <T = unknown, R = unknown>(
		fn: () => Promise<R>,
		options: TaskOptions = {},
	): string => {
		const id = generateId();
		const task: Task<T, R> = {
			id,
			fn,
			data: options.data as T,
			status: "pending",
			attempts: 0,
			maxRetries: options.maxRetries ?? 3,
			createdAt: Date.now(),
		};

		tasks.set(id, task);
		processNext();
		return id;
	};

	const remove = (id: string): boolean => {
		if (running.has(id)) {
			return false;
		}
		return tasks.delete(id);
	};

	const get = (id: string): Task | undefined => {
		return tasks.get(id);
	};

	const getAll = (): Task[] => {
		return Array.from(tasks.values());
	};

	const getRunning = (): Task[] => {
		return Array.from(tasks.values()).filter(
			(task) => task.status === "running",
		);
	};

	const clear = (): void => {
		tasks.clear();
		running.clear();
	};

	const size = (): number => {
		return tasks.size;
	};

	const isEmpty = (): boolean => {
		return tasks.size === 0;
	};

	const on = <T = unknown, R = unknown>(
		event: TaskEventType,
		listener: TaskEventListener<T, R>,
	): void => {
		if (!listeners.has(event)) {
			listeners.set(event, new Set());
		}
		listeners.get(event)?.add(listener as TaskEventListener);
	};

	const off = <T = unknown, R = unknown>(
		event: TaskEventType,
		listener: TaskEventListener<T, R>,
	): void => {
		const eventListeners = listeners.get(event);
		if (eventListeners) {
			eventListeners.delete(listener as TaskEventListener);
		}
	};

	return {
		add,
		remove,
		get,
		getAll,
		getPending,
		getRunning,
		clear,
		size,
		isEmpty,
		on,
		off,
	};
}

export type TaskQueue = ReturnType<typeof createTaskQueue>;
