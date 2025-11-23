import { Brain } from "lucide-solid";
import { createEffect, For, on, onCleanup, onMount, Show } from "solid-js";
import { Button } from "~/components/Button";
import { Loading } from "~/components/Loading";
import { ScrollableReasoning } from "~/components/Reasoning";
import { Select } from "~/components/Select";
import { useSettings } from "~/hooks/settings";
import { createTranslation } from "~/hooks/translation";
import { PROMPT_ID, SUPPORTED_LANGUAGES } from "~/utils/constants";
import { t } from "~/utils/i18n";
import { getPageContext } from "~/utils/page-context";
import { usePopup } from "./Popup";

const ATTRS = ["id", "as", "class", "role", "aria-label"];
const getElementAttributes = (el?: HTMLElement) => {
	const attrs: Record<string, string> = {};
	if (!el) return attrs;
	for (const attr of ATTRS) {
		const value = el.getAttribute(attr);
		if (value) {
			attrs[attr] = value;
		}
	}
	return attrs;
};

const TranslateElement = (props: {
	element?: HTMLInputElement | HTMLTextAreaElement;
	onClose?: () => void;
}) => {
	let ref: HTMLDivElement | undefined;
	const { settings, setSettings } = useSettings();

	const getText = () => {
		const el = props.element;
		if (!el) return "";
		return el.value || el.innerText || "";
	};

	const [data, retry] = createTranslation(getText, {
		promptId: PROMPT_ID.inputTranslate,
		modelId: () => settings.translate.inputTranslateModel,
		stream: true,
		dstLang: () => settings.translate.inputTranslateLang,
		ctx: () => ({
			page: getPageContext(),
			element: {
				tag: props.element?.tagName.toLowerCase() || "",
				attrs: getElementAttributes(props.element),
			},
		}),
	});

	const handleRetry = () => {
		retry();
	};
	const handleClose = () => {
		props.onClose?.();
	};
	const handleConfirm = () => {
		const el = props.element;
		if (!el) return;

		el.value = data() || "";
		el.innerText = data() || "";

		const inputEvent = new Event("input", { bubbles: true });
		el.dispatchEvent(inputEvent);

		const changeEvent = new Event("change", { bubbles: true });
		el.dispatchEvent(changeEvent);

		props.onClose?.();
	};

	const handleLanguageChange = (e: Event) => {
		const value = (e.target as HTMLSelectElement).value;
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
				case "c":
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
		<div class="p-2 w-full h-full flex flex-col" ref={ref}>
			<pre
				class="p-4 rounded-box grow whitespace-pre-wrap wrap-break-word overflow-auto"
				classList={{
					"bg-error/10": !!data.error,
					"text-error-content": !!data.error,
					"bg-base-100": !data.error,
				}}
			>
				{data.streaming && <Loading size="xs" />}
				{data.error ? data.error.message : data()}
				<Show when={data.reasoning}>
					{(reasoning) => (
						<div class="mt-3 rounded-box border border-base-300 p-3 bg-base-100">
							<div class="mb-2 flex items-center gap-2 text-xs text-base-content/70">
								<Brain size={14} />
								{t("floatingTranslator.sections.reasoning")}
							</div>
							<ScrollableReasoning text={reasoning() || ""} />
						</div>
					)}
				</Show>
			</pre>
			<div class="mt-4 flex justify-end gap-2">
				<Select
					size="xs"
					value={settings.translate.inputTranslateLang}
					onChange={handleLanguageChange}
				>
					<For each={SUPPORTED_LANGUAGES}>
						{(lang) => (
							<option
								selected={lang.code === settings.translate.inputTranslateLang}
								value={lang.code}
							>
								{lang.nativeName}
							</option>
						)}
					</For>
				</Select>
				<div class="grow" />
				<Button
					size="xs"
					onClick={handleRetry}
					disabled={data.loading && data.streaming}
				>
					{data.loading && data.streaming ? (
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
					<kbd class="kbd kbd-xs">C</kbd>
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
	const { addPopup } = usePopup();

	// Calculate position near the input element
	const calculatePopupPosition = (element: HTMLElement) => {
		const rect = element.getBoundingClientRect();
		const popupWidth = 400;
		const popupHeight = 320;
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

		return { x, y, width: popupWidth, height: popupHeight };
	};

	createEffect(
		on(
			() => props.element,
			(element) => {
				if (element) {
					const pos = calculatePopupPosition(element);
					const currentPopup = addPopup({
						...pos,
						pinned: true,
						content: () => (
							<TranslateElement
								element={element as HTMLInputElement | HTMLTextAreaElement}
								onClose={() => currentPopup.close()}
							/>
						),
					});

					onCleanup(() => currentPopup.close());
				}
			},
		),
	);

	return null;
};
