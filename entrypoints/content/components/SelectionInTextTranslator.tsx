import { BatchInTextTranslation } from "../native-components/InTextTranslate";
import ControlFloat from "./ControlFloat";

export default () => {
	const [set, setSet] = createSignal(new Set<HTMLElement>(), { equals: false });

	onCleanup(() => {
		setSet(new Set<HTMLElement>());
	});

	return (
		<>
			<BatchInTextTranslation elements={set()} />
			<ControlFloat
				onSelection={(elements) => {
					setSet((prev) => {
						elements.forEach(prev.add, prev);
						return prev;
					});
				}}
			/>
		</>
	);
};
