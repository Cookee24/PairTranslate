import remarkParse from "remark-parse";
import { For, Show } from "solid-js";
import { unified } from "unified";
import NativeMapping from "./Native";

interface Props {
	text?: string;
	onError?: (error: unknown) => void;
}

const parser = unified().use(remarkParse);
// In production, setting props can be wrapped in requestIdleCallback
// to avoid blocking the main thread during hydration.
export default (props: Props) => {
	const [tree, setTree] = createStore({
		children: [] as import("mdast").RootContent[],
	});

	createEffect(() => {
		try {
			setTree(reconcile(parser.parse(fixMarkdown(props.text || ""))));
		} catch (error) {
			props.onError?.(error);
		}
	});

	return <For each={tree.children}>{(child) => <RenderNode {...child} />}</For>;
};

const Native = NativeMapping();

const RenderNode = (props: import("mdast").RootContent) => {
	return (
		<Show when={props} keyed>
			{(node) => {
				switch (node.type) {
					case "heading": {
						const Component = Native[`h${node.depth}` as keyof typeof Native];
						return (
							<Component>
								<For each={node.children}>
									{(child) => <RenderNode {...child} />}
								</For>
							</Component>
						);
					}

					case "paragraph": {
						// This renderer is intended to used in-text, so we set `display: contents` on the container
						return (
							<Native.p style={{ display: "contents" }}>
								<For each={node.children}>
									{(child) => <RenderNode {...child} />}
								</For>
							</Native.p>
						);
					}

					case "text": {
						return <>{node.value}</>;
					}

					case "emphasis": {
						return (
							<Native.em>
								<For each={node.children}>
									{(child) => <RenderNode {...child} />}
								</For>
							</Native.em>
						);
					}

					case "strong": {
						return (
							<Native.strong>
								<For each={node.children}>
									{(child) => <RenderNode {...child} />}
								</For>
							</Native.strong>
						);
					}

					case "inlineCode": {
						return <Native.code>{node.value}</Native.code>;
					}

					case "code": {
						return (
							<Native.pre>
								<Native.code>{node.value}</Native.code>
							</Native.pre>
						);
					}

					case "link": {
						return (
							<Native.a href={node.url} title={node.title || undefined}>
								<For each={node.children}>
									{(child) => <RenderNode {...child} />}
								</For>
							</Native.a>
						);
					}

					case "image": {
						return (
							<Native.img
								src={node.url}
								alt={node.alt || undefined}
								title={node.title || undefined}
							/>
						);
					}

					case "blockquote": {
						return (
							<Native.blockquote>
								<For each={node.children}>
									{(child) => <RenderNode {...child} />}
								</For>
							</Native.blockquote>
						);
					}

					case "list": {
						const Component = node.ordered ? Native.ol : Native.ul;
						return (
							<Component>
								<For each={node.children}>
									{(child) => <RenderNode {...child} />}
								</For>
							</Component>
						);
					}

					case "listItem": {
						return (
							<Native.li>
								<For each={node.children}>
									{(child) => <RenderNode {...child} />}
								</For>
							</Native.li>
						);
					}

					case "thematicBreak": {
						return <Native.hr />;
					}

					case "break": {
						return <Native.br />;
					}

					case "html": {
						// For security reasons, raw HTML is not rendered
						return (
							<Native.pre>
								<Native.code>{node.value}</Native.code>
							</Native.pre>
						);
					}

					case "table": {
						return (
							<Native.table>
								<For each={node.children}>
									{(child) => <RenderNode {...child} />}
								</For>
							</Native.table>
						);
					}

					case "tableRow": {
						return (
							<Native.tr>
								<For each={node.children}>
									{(child) => <RenderNode {...child} />}
								</For>
							</Native.tr>
						);
					}

					case "tableCell": {
						return (
							<Native.td>
								<For each={node.children}>
									{(child) => <RenderNode {...child} />}
								</For>
							</Native.td>
						);
					}

					case "delete": {
						return (
							<Native.del>
								<For each={node.children}>
									{(child) => <RenderNode {...child} />}
								</For>
							</Native.del>
						);
					}

					case "linkReference":
					case "imageReference":
					case "footnoteReference":
					case "footnoteDefinition":
					case "definition": {
						// These require a reference resolution system
						console.warn(`Reference nodes not yet implemented: ${node.type}`);
						return null;
					}

					case "yaml": {
						// Frontmatter - typically not rendered
						return null;
					}
				}
			}}
		</Show>
	);
};
