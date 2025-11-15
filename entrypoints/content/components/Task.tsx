import { usePopup } from "./Popup";

const TaskPopupContent = () => {
	const { runningTasks, totalTasks, completedTasks } = useTaskList();

	return (
		<Card.Root>
			<Card.Body>
				<Card.Title>{t("common.translationTasks")}</Card.Title>
				<Progress
					variant="primary"
					value={completedTasks()}
					max={totalTasks()}
					class="w-48"
				/>
				<span class="text-sm">
					{`${completedTasks()} / ${totalTasks()} ${t("common.completed")} (${runningTasks()} ${t("common.running")})`}
				</span>
			</Card.Body>
		</Card.Root>
	);
};

export default () => {
	const { runningTasks } = useTaskList();
	const { addPopup } = usePopup();
	const { settings } = useSettings();

	createEffect(() => {
		if (!settings.basic.progressIndicationEnabled) return;
		if (runningTasks() > 0) {
			const popup = addPopup({
				x: window.innerWidth - 280,
				y: 20,
				width: 240,
				height: 160,
				pinned: true,
				content: () => <TaskPopupContent />,
			});

			onCleanup(() => popup.close());
		}
	});

	return null;
};
