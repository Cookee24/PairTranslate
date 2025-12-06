export function* iterateNodes(start: Node, end: Node | null): Generator<Node> {
	let node: Node | null = start;
	while (node) {
		yield node;
		if (node === end) break;
		node = node.nextSibling;
	}
}
