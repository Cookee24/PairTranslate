import { RefreshCcw } from "lucide-solid";
import { type JSX, onMount } from "solid-js";
import Loading from "./Loading";

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
	operation: Operation;
}

export default (props: Props) => {
	const [local, rest] = splitProps(props, ["operation", "class"]);
	let contentRef: HTMLSpanElement | undefined;

	const [text, { loading, error, len, retry }] = useTranslation(
		() => props.operation,
		{
			stream: true,
			floating: true,
			queue: false,
		},
	);

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
						{props.operation.textContext.before}
					</span>
					<span
						ref={contentRef}
						class="font-bold bg-accent text-accent-content"
					>
						{props.operation.textContext.content}
					</span>
					<span class="font-extralight text-accent-content/30">
						{props.operation.textContext.after}
						<br /> <br />
					</span>
				</p>
				<div class="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-accent to-transparent pointer-events-none" />
			</div>
			<div class="overflow-y-auto flex-1 bg-gradient-to-b from-accent to-transparent to-20%">
				{props.operation.type === "explain" && (
					<div class="m-2">
						<Mdx text={text()} />
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
				<div class="flex justify-center my-4" hidden={loading() || !!error()}>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => retry({ cleanCache: true })}
					>
						<RefreshCcw size={12} />
						{t("common.retry")}
					</Button>
				</div>
			</div>
		</div>
	);
};
