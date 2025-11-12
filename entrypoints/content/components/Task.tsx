import { createEffect, createSignal } from "solid-js";
import { clampPosition, type PopupActions, usePopup } from "./Popup";

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
	const { createPopup, getPopupStore } = usePopup();
	const { settings } = useSettings();
	const [popup, setPopup] = createSignal<PopupActions>();

	createEffect(() => {
		if (!settings.basic.progressIndicationEnabled) return;
		const popup_ = untrack(popup);
		if (runningTasks() > 0 && !popup_) {
			const id = createPopup(() => <TaskPopupContent />, {
				position: clampPosition(
					{ x: window.innerWidth - 280, y: 20 },
					{
						width: 240,
						height: 160,
					},
				),
				width: 240,
				height: 160,
				pinned: true,
			});
			setPopup(getPopupStore(id)?.[1]);
		} else if (runningTasks() === 0 && popup_) {
			popup_.setVisibility(false);
			setPopup(undefined);
		}
	});

	return null;
};
