import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { createEffect, For, Show } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { unified } from "unified";
import { fixMarkdown } from "~/utils/markdown";
import NativeMapping from "./Native";

interface Props {
	text?: string;
	onError?: (error: unknown) => void;
}

const parser = unified().use(remarkParse).use(remarkMath).freeze();
// In production, setting props can be wrapped in requestIdleCallback
// to avoid blocking the main thread during hydration.
export const Md = (props: Props) => {
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
						return <Native.code>{node.value}</Native.code>;
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

					case "math":
						return <Native.math content={node.value} center />;
					case "inlineMath":
						return <Native.math content={node.value} />;

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

export const MdStyled = (props: Props) => {
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

	return (
		<For each={tree.children}>{(child) => <RenderStyledNode {...child} />}</For>
	);
};

const Styled = NativeMapping(true, true);
const RenderStyledNode = (props: import("mdast").RootContent) => {
	return (
		<Show when={props} keyed>
			{(node) => {
				switch (node.type) {
					case "heading": {
						const Component = Styled[`h${node.depth}` as keyof typeof Styled];
						return (
							<Component>
								<For each={node.children}>
									{(child) => <RenderStyledNode {...child} />}
								</For>
							</Component>
						);
					}

					case "paragraph": {
						return (
							<Styled.p>
								<For each={node.children}>
									{(child) => <RenderStyledNode {...child} />}
								</For>
							</Styled.p>
						);
					}

					case "text": {
						return <>{node.value}</>;
					}

					case "emphasis": {
						return (
							<Styled.em>
								<For each={node.children}>
									{(child) => <RenderStyledNode {...child} />}
								</For>
							</Styled.em>
						);
					}

					case "strong": {
						return (
							<Styled.strong>
								<For each={node.children}>
									{(child) => <RenderStyledNode {...child} />}
								</For>
							</Styled.strong>
						);
					}

					case "inlineCode": {
						return <Styled.code>{node.value}</Styled.code>;
					}

					case "code": {
						return (
							<Styled.pre>
								<Styled.code>{node.value}</Styled.code>
							</Styled.pre>
						);
					}

					case "link": {
						return (
							<Styled.a href={node.url} title={node.title || undefined}>
								<For each={node.children}>
									{(child) => <RenderStyledNode {...child} />}
								</For>
							</Styled.a>
						);
					}

					case "image": {
						return (
							<Styled.img
								src={node.url}
								alt={node.alt || undefined}
								title={node.title || undefined}
							/>
						);
					}

					case "blockquote": {
						return (
							<Styled.blockquote>
								<For each={node.children}>
									{(child) => <RenderStyledNode {...child} />}
								</For>
							</Styled.blockquote>
						);
					}

					case "list": {
						const Component = node.ordered ? Styled.ol : Styled.ul;
						return (
							<Component>
								<For each={node.children}>
									{(child) => <RenderStyledNode {...child} />}
								</For>
							</Component>
						);
					}

					case "listItem": {
						return (
							<Styled.li>
								<For each={node.children}>
									{(child) => <RenderStyledNode {...child} />}
								</For>
							</Styled.li>
						);
					}

					case "thematicBreak": {
						return <Styled.hr />;
					}

					case "break": {
						return <Styled.br />;
					}

					case "html": {
						// For security reasons, raw HTML is not rendered
						return <Styled.code>{node.value}</Styled.code>;
					}

					case "table": {
						return (
							<Styled.table>
								<For each={node.children}>
									{(child) => <RenderStyledNode {...child} />}
								</For>
							</Styled.table>
						);
					}

					case "tableRow": {
						return (
							<Styled.tr>
								<For each={node.children}>
									{(child) => <RenderStyledNode {...child} />}
								</For>
							</Styled.tr>
						);
					}

					case "tableCell": {
						return (
							<Styled.td>
								<For each={node.children}>
									{(child) => <RenderStyledNode {...child} />}
								</For>
							</Styled.td>
						);
					}

					case "delete": {
						return (
							<Styled.del>
								<For each={node.children}>
									{(child) => <RenderStyledNode {...child} />}
								</For>
							</Styled.del>
						);
					}

					case "math":
						return <Styled.math content={node.value} center />;
					case "inlineMath":
						return <Styled.math content={node.value} />;

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
