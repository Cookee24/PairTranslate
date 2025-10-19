import { BatchInTextTranslation } from "../native-components/InTextTranslate";
import ControlFloat from "./ControlFloat";
import TripleTouch from "./TripleTouch";

export default () => {
	const { settings } = useSettings();
	const [set, setSet] = createSignal(new Set<HTMLElement>(), { equals: false });

	onCleanup(() => {
		setSet(new Set<HTMLElement>());
	});

	const onSelection = (elements: HTMLElement[]) => {
		setSet((prev) => {
			elements.forEach(prev.add, prev);
			elements.forEach((el) => {
				animateBlink(el);
			});
			return prev;
		});
	};

	return (
		<Show when={settings.basic.selectionTranslateEnabled}>
			<BatchInTextTranslation elements={set()} />
			<ControlFloat onSelection={onSelection} />
			<TripleTouch onSelection={onSelection} />
		</Show>
	);
};
