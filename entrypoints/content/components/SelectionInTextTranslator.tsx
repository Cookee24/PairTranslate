import { createSignal, onCleanup } from "solid-js";
import { animateBlink } from "~/hooks/animation";
import { BatchInTextTranslation } from "../native-components/InTextTranslate";
import ControlFloat from "./ControlFloat";
import TripleTouch from "./TripleTouch";

export default () => {
	const [set, setSet] = createSignal(new Set<HTMLElement>(), { equals: false });

	onCleanup(() => {
		setSet(new Set<HTMLElement>());
	});

	const onSelection = (elements: HTMLElement[]) => {
		setSet((prev) => {
			elements.forEach(prev.add, prev);
			elements.forEach((element) => {
				animateBlink(element);
			});
			return prev;
		});
	};

	return (
		<>
			<BatchInTextTranslation
				elements={set()}
				onDelete={(element) =>
					setSet((prev) => {
						prev.delete(element);
						return prev;
					})
				}
			/>
			<ControlFloat onSelection={onSelection} />
			<TripleTouch onSelection={onSelection} />
		</>
	);
};
