import type { JSX } from "solid-js";
import { createMemo, splitProps } from "solid-js";
import { useSettings } from "~/hooks/settings";
import { createTranslation } from "~/hooks/translation";
import { cn } from "~/utils/cn";
import { PROMPT_ID } from "~/utils/constants";
import { jsonAutocomplete } from "~/utils/json-autocomplete";
import { getPageContext } from "~/utils/page-context";
import type { ExplainOutput } from "~/utils/prompt";
import type { TextContext } from "~/utils/types";

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
	textContext: TextContext;
	mode: "translate" | "explain";
}

export default (props: Props) => {
	const [local, rest] = splitProps(props, ["class", "textContext", "mode"]);

	return (
		<div class={cn("w-full h-full", local.class)} {...rest}>
			{local.mode === "translate" ? (
				<Translate textContext={local.textContext} />
			) : (
				<Explain textContext={local.textContext} />
			)}
		</div>
	);
};

const Explain = (props: { textContext: TextContext }) => {
	const { settings } = useSettings();
	const [data, _retry] = createTranslation(() => props.textContext.text, {
		promptId: PROMPT_ID.explain,
		modelId: () => settings.translate.floatingExplainModel,
		ctx: () => ({
			surr: props.textContext.surr,
			page: getPageContext(),
		}),
		stream: true,
	});
	const _completeData = createMemo(
		() =>
			JSON.parse(jsonAutocomplete(data() || "{}")) as Partial<ExplainOutput>,
	);

	return null; // TODO: implement explain UI
};

const Translate = (props: { textContext: TextContext }) => {
	const { settings } = useSettings();
	const [_data, _retry] = createTranslation(() => props.textContext.text, {
		promptId: PROMPT_ID.translate,
		modelId: () => settings.translate.floatingTranslateModel,
		ctx: () => ({
			surr: props.textContext.surr,
			page: getPageContext(),
		}),
		stream: true,
	});

	return (
		<div>
			<div class="font-mono text-sm max-h-28 whitespace-break-spaces overflow-y-auto">
				<span>{props.textContext.surr?.before}</span>
				<span>{props.textContext.text}</span>
				<span>{props.textContext.surr?.after}</span>
			</div>
		</div>
	);
};
