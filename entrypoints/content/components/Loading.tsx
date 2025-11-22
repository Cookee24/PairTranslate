import { mergeRefs } from "@solid-primitives/refs";
import { CircleX } from "lucide-solid";
import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { Loading } from "~/components/Loading";
import { cn } from "~/utils/cn";
import { t } from "~/utils/i18n";

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
	loading?: boolean;
	error?: string;
	len?: number;
}

export default (props: Props) => {
	let _ref: HTMLDivElement | undefined;
	const [local, rest] = splitProps(props, ["loading", "len", "error", "class"]);

	return (
		<div
			ref={mergeRefs((r) => {
				_ref = r;
			}, props.ref)}
			class={cn(
				"min-h-8 p-2 rounded-field flex items-center justify-center",
				local.class,
				local.error
					? "bg-error text-error-content"
					: "bg-base-100 text-base-content",
			)}
			hidden={!local.loading && !local.error}
			{...rest}
		>
			{local.loading && <Loading size="sm" />}
			{local.loading && (
				<span class="ml-2 text-sm font-mono">
					↓ {local.len} {t("common.loading")}
				</span>
			)}
			{local.error && <CircleX size={20} />}
			{local.error && <span class="ml-2 text-sm font-mono">{local.error}</span>}
		</div>
	);
};
