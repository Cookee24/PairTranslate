import { createSignal, onCleanup } from "solid-js";
import { animateBlink } from "~/hooks/animation";
import type { DOMSection } from "~/utils/parser/types";
import { BatchInTextTranslation } from "../native-components/InTextTranslate";
import ControlFloat from "./ControlFloat";
import TripleTouch from "./TripleTouch";

export default () => {
	const [set, setSet] = createSignal(new Set<DOMSection>(), { equals: false });

	onCleanup(() => {
		setSet(new Set<DOMSection>());
	});

	const onSelection = (sections: DOMSection[]) => {
		setSet((prev) => {
			sections.forEach(prev.add, prev);
			sections.forEach((node) => {
				const anchor = Array.isArray(node) ? node[0] : node;
				const el =
					anchor instanceof HTMLElement ? anchor : anchor.parentElement;
				el && animateBlink(el);
			});
			return prev;
		});
	};

	return (
		<>
			<BatchInTextTranslation
				sections={set()}
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
