import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { createEffect, For, Match, Switch } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { Dynamic } from "solid-js/web";
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
		<Switch>
			<Match when={props.type === "heading" && props}>
				{(node) => (
					<Dynamic
						component={Native[`h${node().depth}` as keyof typeof Native]}
					>
						<For each={node().children}>
							{(child) => <RenderNode {...child} />}
						</For>
					</Dynamic>
				)}
			</Match>

			<Match when={props.type === "paragraph" && props}>
				{(node) => (
					<Native.p style={{ display: "contents" }}>
						<For each={node().children}>
							{(child) => <RenderNode {...child} />}
						</For>
					</Native.p>
				)}
			</Match>

			<Match when={props.type === "text" && props}>
				{(node) => <>{node().value}</>}
			</Match>

			<Match when={props.type === "emphasis" && props}>
				{(node) => (
					<Native.em>
						<For each={node().children}>
							{(child) => <RenderNode {...child} />}
						</For>
					</Native.em>
				)}
			</Match>

			<Match when={props.type === "strong" && props}>
				{(node) => (
					<Native.strong>
						<For each={node().children}>
							{(child) => <RenderNode {...child} />}
						</For>
					</Native.strong>
				)}
			</Match>

			<Match when={props.type === "inlineCode" && props}>
				{(node) => <Native.code>{node().value}</Native.code>}
			</Match>

			<Match when={props.type === "code" && props}>
				{(node) => (
					<Native.pre>
						<Native.code>{node().value}</Native.code>
					</Native.pre>
				)}
			</Match>

			<Match when={props.type === "link" && props}>
				{(node) => (
					<Native.a href={node().url} title={node().title || undefined}>
						<For each={node().children}>
							{(child) => <RenderNode {...child} />}
						</For>
					</Native.a>
				)}
			</Match>

			<Match when={props.type === "image" && props}>
				{(node) => (
					<Native.img
						src={node().url}
						alt={node().alt || undefined}
						title={node().title || undefined}
					/>
				)}
			</Match>

			<Match when={props.type === "blockquote" && props}>
				{(node) => (
					<Native.blockquote>
						<For each={node().children}>
							{(child) => <RenderNode {...child} />}
						</For>
					</Native.blockquote>
				)}
			</Match>

			<Match when={props.type === "list" && props}>
				{(node) => (
					<Dynamic component={node().ordered ? Native.ol : Native.ul}>
						<For each={node().children}>
							{(child) => <RenderNode {...child} />}
						</For>
					</Dynamic>
				)}
			</Match>

			<Match when={props.type === "listItem" && props}>
				{(node) => (
					<Native.li>
						<For each={node().children}>
							{(child) => <RenderNode {...child} />}
						</For>
					</Native.li>
				)}
			</Match>

			<Match when={props.type === "thematicBreak"}>
				<Native.hr />
			</Match>

			<Match when={props.type === "break"}>
				<Native.br />
			</Match>

			<Match when={props.type === "html" && props}>
				{(node) => (
					// For security reasons, raw HTML is not rendered
					<Native.code>{node().value}</Native.code>
				)}
			</Match>

			<Match when={props.type === "table" && props}>
				{(node) => (
					<Native.table>
						<For each={node().children}>
							{(child) => <RenderNode {...child} />}
						</For>
					</Native.table>
				)}
			</Match>

			<Match when={props.type === "tableRow" && props}>
				{(node) => (
					<Native.tr>
						<For each={node().children}>
							{(child) => <RenderNode {...child} />}
						</For>
					</Native.tr>
				)}
			</Match>

			<Match when={props.type === "tableCell" && props}>
				{(node) => (
					<Native.td>
						<For each={node().children}>
							{(child) => <RenderNode {...child} />}
						</For>
					</Native.td>
				)}
			</Match>

			<Match when={props.type === "delete" && props}>
				{(node) => (
					<Native.del>
						<For each={node().children}>
							{(child) => <RenderNode {...child} />}
						</For>
					</Native.del>
				)}
			</Match>

			<Match when={props.type === "math" && props}>
				{(node) => <Native.math content={node().value} center />}
			</Match>

			<Match when={props.type === "inlineMath" && props}>
				{(node) => <Native.math content={node().value} />}
			</Match>

			<Match
				when={
					[
						"linkReference",
						"imageReference",
						"footnoteReference",
						"footnoteDefinition",
						"definition",
					].includes(props.type) && props
				}
			>
				{(node) => {
					console.warn(`Reference nodes not yet implemented: ${node().type}`);
					return null;
				}}
			</Match>

			<Match when={props.type === "yaml"}>
				{/* Frontmatter - typically not rendered */}
				{null}
			</Match>
		</Switch>
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
		<Switch>
			<Match when={props.type === "heading" && props}>
				{(node) => (
					<Dynamic
						component={Styled[`h${node().depth}` as keyof typeof Styled]}
					>
						<For each={node().children}>
							{(child) => <RenderStyledNode {...child} />}
						</For>
					</Dynamic>
				)}
			</Match>

			<Match when={props.type === "paragraph" && props}>
				{(node) => (
					<Styled.p>
						<For each={node().children}>
							{(child) => <RenderStyledNode {...child} />}
						</For>
					</Styled.p>
				)}
			</Match>

			<Match when={props.type === "text" && props}>
				{(node) => <>{node().value}</>}
			</Match>

			<Match when={props.type === "emphasis" && props}>
				{(node) => (
					<Styled.em>
						<For each={node().children}>
							{(child) => <RenderStyledNode {...child} />}
						</For>
					</Styled.em>
				)}
			</Match>

			<Match when={props.type === "strong" && props}>
				{(node) => (
					<Styled.strong>
						<For each={node().children}>
							{(child) => <RenderStyledNode {...child} />}
						</For>
					</Styled.strong>
				)}
			</Match>

			<Match when={props.type === "inlineCode" && props}>
				{(node) => <Styled.code>{node().value}</Styled.code>}
			</Match>

			<Match when={props.type === "code" && props}>
				{(node) => (
					<Styled.pre>
						<Styled.code>{node().value}</Styled.code>
					</Styled.pre>
				)}
			</Match>

			<Match when={props.type === "link" && props}>
				{(node) => (
					<Styled.a href={node().url} title={node().title || undefined}>
						<For each={node().children}>
							{(child) => <RenderStyledNode {...child} />}
						</For>
					</Styled.a>
				)}
			</Match>

			<Match when={props.type === "image" && props}>
				{(node) => (
					<Styled.img
						src={node().url}
						alt={node().alt || undefined}
						title={node().title || undefined}
					/>
				)}
			</Match>

			<Match when={props.type === "blockquote" && props}>
				{(node) => (
					<Styled.blockquote>
						<For each={node().children}>
							{(child) => <RenderStyledNode {...child} />}
						</For>
					</Styled.blockquote>
				)}
			</Match>

			<Match when={props.type === "list" && props}>
				{(node) => (
					<Dynamic component={node().ordered ? Styled.ol : Styled.ul}>
						<For each={node().children}>
							{(child) => <RenderStyledNode {...child} />}
						</For>
					</Dynamic>
				)}
			</Match>

			<Match when={props.type === "listItem" && props}>
				{(node) => (
					<Styled.li>
						<For each={node().children}>
							{(child) => <RenderStyledNode {...child} />}
						</For>
					</Styled.li>
				)}
			</Match>

			<Match when={props.type === "thematicBreak"}>
				<Styled.hr />
			</Match>

			<Match when={props.type === "break"}>
				<Styled.br />
			</Match>

			<Match when={props.type === "html" && props}>
				{(node) => (
					// For security reasons, raw HTML is not rendered
					<Styled.code>{node().value}</Styled.code>
				)}
			</Match>

			<Match when={props.type === "table" && props}>
				{(node) => (
					<Styled.table>
						<For each={node().children}>
							{(child) => <RenderStyledNode {...child} />}
						</For>
					</Styled.table>
				)}
			</Match>

			<Match when={props.type === "tableRow" && props}>
				{(node) => (
					<Styled.tr>
						<For each={node().children}>
							{(child) => <RenderStyledNode {...child} />}
						</For>
					</Styled.tr>
				)}
			</Match>

			<Match when={props.type === "tableCell" && props}>
				{(node) => (
					<Styled.td>
						<For each={node().children}>
							{(child) => <RenderStyledNode {...child} />}
						</For>
					</Styled.td>
				)}
			</Match>

			<Match when={props.type === "delete" && props}>
				{(node) => (
					<Styled.del>
						<For each={node().children}>
							{(child) => <RenderStyledNode {...child} />}
						</For>
					</Styled.del>
				)}
			</Match>

			<Match when={props.type === "math" && props}>
				{(node) => <Styled.math content={node().value} center />}
			</Match>

			<Match when={props.type === "inlineMath" && props}>
				{(node) => <Styled.math content={node().value} />}
			</Match>

			<Match
				when={
					[
						"linkReference",
						"imageReference",
						"footnoteReference",
						"footnoteDefinition",
						"definition",
					].includes(props.type) && props
				}
			>
				{(node) => {
					console.warn(`Reference nodes not yet implemented: ${node().type}`);
					return null;
				}}
			</Match>

			<Match when={props.type === "yaml"}>
				{/* Frontmatter - typically not rendered */}
				{null}
			</Match>
		</Switch>
	);
};
