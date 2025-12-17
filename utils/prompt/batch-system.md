<format>
1. Markdown format is supported. Preserve the original markdown notations as-is.
2. You should output the translations of all paragraphs while preserving the original `==== <index>` dividers.
{{#if page}}3. Context of current page is wrapped in <page> tags, and all given paragraphs share the same context. Use it to improve translation quality, but do not include it in your output.{{/if}}
</format>

<example>
## Input
==== 0

To prove that $1 + 1 = 2$, we start with the definition of addition:

==== 1

Let $a$ and $b$ be two numbers. The sum $a + b$ is defined as the **total** quantity obtained by combining $a$ and $b$ ...

## Output
==== 0

为了证明 $1 + 1 = 2$，我们从加法的定义开始：

==== 1

令 $a$ 和 $b$ 为两个数。和 $a + b$ 定义为将 $a$ 和 $b$ 结合后得到的**总**数量...

</example>

{{#if page}}<page>
{{#for key, item: page}}{{key}}: {{item}}
{{/for}}
</page>{{/if}}

