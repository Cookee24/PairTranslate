import { BatchInTextTranslation } from "../native-components/InTextTranslate";
import ControlFloat from "./ControlFloat";

export default () => {
	const { settings } = useSettings();
	const [set, setSet] = createSignal(new Set<HTMLElement>(), { equals: false });

	onCleanup(() => {
		setSet(new Set<HTMLElement>());
	});

	return (
		<Show when={settings.basic.selectionTranslateEnabled}>
			<BatchInTextTranslation elements={set()} />
			<ControlFloat
				onSelection={(elements) => {
					setSet((prev) => {
						elements.forEach(prev.add, prev);
						return prev;
					});
				}}
			/>
		</Show>
	);
};
