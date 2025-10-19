import { createEffect, createSignal, on, onCleanup } from "solid-js";
import { SUPPORTED_LANGUAGES } from "~/utils/constants";
import type { Position } from "../types";
import { clampPosition, type PopupActions, usePopup } from "./Popup";

const TranslateElement = (props: {
	element?: HTMLInputElement | HTMLTextAreaElement;
	onClose?: () => void;
}) => {
	let ref: HTMLDivElement | undefined;
	const { settings, setSettings } = useSettings();
	const [targetLang, setTargetLang] = createSignal(
		settings.translate.inputTranslateLang,
	);

	const getText = () => {
		const el = props.element;
		if (!el) return "";
		return el.value || el.innerText || "";
	};
	const [text, { error, loading, retry }] = useInputTranslation(
		getText,
		targetLang,
	);

	const handleRetry = () => {
		if (loading()) return;
		retry();
	};
	const handleClose = () => {
		props.onClose?.();
	};
	const handleConfirm = () => {
		const el = props.element;
		if (!el) return;

		el.value = text();
		el.innerText = text();

		const inputEvent = new Event("input", { bubbles: true });
		el.dispatchEvent(inputEvent);

		const changeEvent = new Event("change", { bubbles: true });
		el.dispatchEvent(changeEvent);

		props.onClose?.();
	};

	const handleLanguageChange = (e: Event) => {
		const value = (e.target as HTMLSelectElement).value;
		setTargetLang(value);
		setSettings("translate", "inputTranslateLang", value);
	};

	onMount(() => {
		ref?.focus();
	});

	createEffect(() => {
		const el = props.element;
		if (!el) return;

		const handleKeydown = (event: Event) => {
			if (!(event instanceof KeyboardEvent)) return;
			event.preventDefault();
			event.stopPropagation();
			switch (event.key.toLowerCase()) {
				case "escape":
					handleClose();
					break;
				case "enter":
					handleConfirm();
					break;
				case "r":
					handleRetry();
					break;
			}
		};

		document.addEventListener("keydown", handleKeydown, { capture: true });
		onCleanup(() => {
			document.removeEventListener("keydown", handleKeydown, { capture: true });
		});
	});

	onCleanup(() => {
		props.onClose?.();
	});

	return (
		<div class="p-4 w-full h-full flex flex-col" ref={ref}>
			<pre
				class="p-4 rounded-md flex-grow whitespace-pre-wrap break-words overflow-auto"
				classList={{
					"bg-error/10": !!error(),
					"text-error-content": !!error(),
					"bg-base-300": !error(),
				}}
			>
				{error() ? error() : text()}
			</pre>
			<div class="mt-4 flex justify-end gap-2">
				<Select size="xs" value={targetLang()} onChange={handleLanguageChange}>
					<For each={SUPPORTED_LANGUAGES}>
						{(lang) => <option value={lang.code}>{lang.nativeName}</option>}
					</For>
				</Select>
				<div class="flex-grow" />
				<Button size="xs" onClick={handleRetry} disabled={loading()}>
					{loading() ? (
						<>
							<Loading size="xs" />
							{t("common.loading")}
						</>
					) : (
						<>
							<kbd class="kbd kbd-xs text-base-content">R</kbd>
							{t("common.retry")}
						</>
					)}
				</Button>
				<Button variant="error" size="xs" onClick={handleClose}>
					<kbd class="kbd kbd-xs">Esc</kbd>
					{t("common.close")}
				</Button>
				<Button variant="success" size="xs" onClick={handleConfirm}>
					<kbd class="kbd kbd-xs">↵</kbd>
					{t("common.confirm")}
				</Button>
			</div>
		</div>
	);
};

interface Props {
	element?: HTMLElement;
	onClose?: () => void;
}
export default (props: Props) => {
	const { createPopup, getPopupStore } = usePopup();
	const [popupActions, setPopupActions] = createSignal<PopupActions>();

	// Calculate position near the input element
	const calculatePopupPosition = (
		element: HTMLElement,
	): { position: Position; width: number; height: number } => {
		const rect = element.getBoundingClientRect();
		const popupWidth = 400;
		const popupHeight = 300;
		const spacing = 8;

		// Try to position below the input element first
		let x = rect.left;
		let y = rect.bottom + spacing;

		// If not enough space below, position above
		if (y + popupHeight > window.innerHeight) {
			y = rect.top - popupHeight - spacing;
		}

		// If still not enough space, position to the right or left
		if (y < 0) {
			y = rect.top;
			if (rect.right + popupWidth + spacing < window.innerWidth) {
				x = rect.right + spacing;
			} else {
				x = rect.left - popupWidth - spacing;
			}
		}

		// Clamp position to viewport
		const position = clampPosition(
			{ x, y },
			{ width: popupWidth, height: popupHeight },
		);

		return { position, width: popupWidth, height: popupHeight };
	};

	createEffect(
		on(
			() => props.element,
			(element) => {
				// Clean up previous popup if exists
				popupActions()?.setVisibility(false);
				setPopupActions(undefined);

				// Create new popup if element is provided
				if (element) {
					const { position, width, height } = calculatePopupPosition(element);

					const id = createPopup(
						() => (
							<TranslateElement
								element={element as HTMLInputElement | HTMLTextAreaElement}
								onClose={() => popupActions()?.setVisibility(false)}
							/>
						),
						{
							position,
							width,
							height,
						},
					);

					setPopupActions(getPopupStore(id)?.[1]);
				}
			},
		),
	);

	// Clean up on unmount
	onCleanup(() => {
		popupActions()?.setVisibility(false);
	});

	return null;
};
