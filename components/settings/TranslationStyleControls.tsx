import { Bold, Highlighter, Italic, Underline } from "lucide-solid";
import type { Component } from "solid-js";
import { Button } from "~/components/Button";
import { nextBackgroundColor } from "~/hooks/translation-style";
import { t } from "~/utils/i18n";
import type { TranslationStyleSettings } from "~/utils/settings";

const DEFAULT_STYLE: TranslationStyleSettings = {
	bold: false,
	italic: false,
	underline: false,
};

export interface TranslationStyleControlsProps {
	value?: TranslationStyleSettings;
	onChange?: (style: TranslationStyleSettings | undefined) => void;
	allowUnset?: boolean;
	class?: string;
}

export const TranslationStyleControls: Component<
	TranslationStyleControlsProps
> = (props) => {
	const resolvedStyle = () => props.value ?? DEFAULT_STYLE;

	const applyStyle = (patch: Partial<TranslationStyleSettings>) => {
		const next: TranslationStyleSettings = {
			...resolvedStyle(),
			...patch,
		};

		if (!next.background) {
			delete next.background;
		}

		const shouldUnset =
			props.allowUnset &&
			!next.bold &&
			!next.italic &&
			!next.underline &&
			!next.background;

		if (shouldUnset) {
			props.onChange?.(undefined);
			return;
		}

		props.onChange?.(next);
	};

	const toggleStyle = (key: keyof TranslationStyleSettings) => {
		const current = resolvedStyle();
		applyStyle({ [key]: !current[key] } as Partial<TranslationStyleSettings>);
	};

	const cycleBackground = () => {
		const nextColor = nextBackgroundColor(resolvedStyle().background);
		applyStyle({ background: nextColor });
	};

	const backgroundColor = () => resolvedStyle().background;

	return (
		<div class={`join w-fit ${props.class ?? ""}`}>
			<Button
				type="button"
				size="sm"
				variant={resolvedStyle().bold ? "secondary" : "ghost"}
				class="join-item"
				onClick={() => toggleStyle("bold")}
				title={t("settings.translation.styleBold")}
			>
				<Bold size={16} />
			</Button>
			<Button
				type="button"
				size="sm"
				variant={resolvedStyle().italic ? "secondary" : "ghost"}
				class="join-item"
				onClick={() => toggleStyle("italic")}
				title={t("settings.translation.styleItalic")}
			>
				<Italic size={16} />
			</Button>
			<Button
				type="button"
				size="sm"
				variant={resolvedStyle().underline ? "secondary" : "ghost"}
				class="join-item"
				onClick={() => toggleStyle("underline")}
				title={t("settings.translation.styleUnderline")}
			>
				<Underline size={16} />
			</Button>
			<Button
				type="button"
				size="sm"
				variant={"ghost"}
				class="join-item gap-2"
				onClick={cycleBackground}
				title={t("settings.translation.styleBackgroundDesc")}
				style={{
					"background-color": backgroundColor() ?? "inherit",
				}}
			>
				<Highlighter size={16} />
			</Button>
		</div>
	);
};
