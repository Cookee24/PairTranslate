import { BatchInTextTranslation } from "../native-components/InTextTranslate";
import {
	destroyObservers,
	listenIntersectionOrRemove,
	listenRemove,
} from "../observer";
import { getDomListener } from "../parser";

interface Props {
	enabled?: boolean;
}

export default (props: Props) => {
	const { settings } = useSettings();
	const [set, setSet] = createSignal(new Set<HTMLElement>(), { equals: false });

	createEffect(
		on(
			() => props.enabled,
			async (enabled) => {
				if (!enabled) return;
				let cancelled = false;
				const listener = await getDomListener(window.location.hostname, {
					filterInteractive: settings.translate.filterInteractive,
				});

				onCleanup(() => {
					cancelled = true;
					destroyObservers();
					setSet(new Set<HTMLElement>());
				});

				for await (const element of listener) {
					if (cancelled) break;

					const fullPage = settings.translate.translateFullPage;
					if (fullPage) {
						setSet((s) => s.add(element));
						listenRemove(element, () => {
							setSet((s) => {
								s.delete(element);
								return s;
							});
						});
					} else {
						listenIntersectionOrRemove(element, (shouldRender) => {
							shouldRender
								? setSet((s) => s.add(element))
								: setSet((s) => {
										s.delete(element);
										return s;
									});
						});
					}
				}
			},
		),
	);

	return (
		<BatchInTextTranslation
			elements={set()}
			onDelete={(element) =>
				setSet((prev) => {
					prev.delete(element);
					return prev;
				})
			}
		/>
	);
};
