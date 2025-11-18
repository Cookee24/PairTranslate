import { RefreshCcw } from "lucide-solid";
import { type JSX, onMount } from "solid-js";
import Loading from "./Loading";

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
	content: TextContext;
	mode: "translate" | "explain";
}

export default (props: Props) => {
	const [local, rest] = splitProps(props, ["class", "content", "mode"]);
	let contentRef: HTMLSpanElement | undefined;

	const [data, retry] = createTranslation(() => props.content.text, {
		ctx: () => ({
			page: getPageContext(),
			surr: props.content.surr,
		}),
	});

	onMount(() => {
		if (!contentRef) return;
		setTimeout(() => {
			contentRef.scrollIntoView({
				behavior: "smooth",
				block: "center",
				inline: "center",
			});
			animateBlink(contentRef, 2);
		}, 100);
	});

	return (
		<div class={cn("w-full h-full", local.class)} {...rest}>
			<div class="relative">
				<p class="bg-accent font-mono h-24 overflow-auto">
					<span class="font-extralight text-accent-content/30">
						<br /> <br />
						{props.content.surr?.before}
					</span>
					<span
						ref={contentRef}
						class="font-bold bg-accent text-accent-content"
					>
						{props.content.text}
					</span>
					<span class="font-extralight text-accent-content/30">
						{props.content.surr?.after}
						<br /> <br />
					</span>
				</p>
				<div class="absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-accent to-transparent pointer-events-none" />
			</div>
			<div class="overflow-y-auto flex-1 bg-linear-to-b from-accent to-transparent to-20%">
				{props.mode === "explain" && (
					<div class="m-2">
						<Mdx text={data()} />
					</div>
				)}
				{props.operation.type === "translate" && (
					<div class="m-2 font-serif whitespace-pre-line">{text()}</div>
				)}
				<Loading
					class="m-2 mt-4"
					loading={loading()}
					error={error() || undefined}
					len={len()}
				/>
				<div
					class="flex justify-center my-4"
					hidden={data.loading || !data.error}
				>
					<Button variant="ghost" size="sm" onClick={() => retry()}>
						<RefreshCcw size={12} />
						{t("common.retry")}
					</Button>
				</div>
			</div>
		</div>
	);
};
