import {
	createContext,
	createEffect,
	createSignal,
	type JSX,
	useContext,
} from "solid-js";

interface Task {
	id: symbol;
	promise: Promise<void>;
	resolve: () => void;
	reject: (reason?: unknown) => void;
}

export interface TaskListContextType {
	add: () => {
		wait: () => Promise<void>;
		done: () => void;
		terminate: () => void;
	};
	runningTasks: () => number;
	totalTasks: () => number;
	completedTasks: () => number;
}

const TaskListContext = createContext<TaskListContextType>();

export function TaskListProvider(props: { children: JSX.Element }) {
	const { settings } = useSettings();
	// Use a signal with `equals: false` to handle a mutable Map.
	const [tasks, setTasks] = createSignal<Map<symbol, Task>>(new Map(), {
		equals: false,
	});
	const [running, setRunning] = createSignal(0);
	const [total, setTotal] = createSignal(0);
	const [completed, setCompleted] = createSignal(0);

	const maxConcurrent = () => settings.translate.concurrentRequests;
	// Access the map by calling the signal function: tasks()

	createEffect(() => {
		const currentTasks = tasks();
		while (running() < maxConcurrent() && currentTasks.size > 0) {
			const nextTaskId = currentTasks.keys().next().value;

			if (nextTaskId) {
				const nextTask = currentTasks.get(nextTaskId);

				if (nextTask) {
					// 1. Mutate the map directly.
					currentTasks.delete(nextTaskId);
					// 2. Trigger the signal update.
					setTasks(currentTasks);

					// 3. Increment the count of running tasks.
					setRunning((r) => r + 1);
					// 4. Resolve the task's promise.
					nextTask.resolve();
				}
			}
		}
	});

	const value: TaskListContextType = {
		add: () => {
			const { promise, resolve, reject } = Promise.withResolvers<void>();

			const task: Task = {
				id: Symbol("task"),
				promise,
				resolve,
				reject,
			};

			// 1. Mutate the map directly.
			const currentTasks = tasks();
			currentTasks.set(task.id, task);
			// 2. Trigger the signal update.
			setTasks(currentTasks);

			setTotal((t) => t + 1);

			return {
				wait: () => promise,
				done: () => {
					setRunning((r) => r - 1);
					setCompleted((c) => c + 1);
				},
				terminate: () => {
					const currentTasks = tasks();
					if (currentTasks.has(task.id)) {
						// 1. Mutate the map directly.
						currentTasks.delete(task.id);
						// 2. Trigger the signal update.
						setTasks(currentTasks);
						reject(new Error("Task terminated"));
					}
				},
			};
		},
		runningTasks: running,
		totalTasks: total,
		completedTasks: completed,
	};

	return (
		<TaskListContext.Provider value={value}>
			{props.children}
		</TaskListContext.Provider>
	);
}

export function useTaskList() {
	const context = useContext(TaskListContext);
	if (!context) {
		throw new Error("useTaskList must be used within a TaskListProvider");
	}
	return context;
}

export function emptyTask() {
	return {
		wait: async () => {},
		done: () => {},
		terminate: () => {},
	};
}
