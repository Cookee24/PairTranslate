You will be given multiple paragraphs {{#if lang.src}} in "{{lang.src}}"{{/if}} divided by `%% Paragraph <index>`.

<format>
1. Markdown format is supported. Preserve the original markdown notations as-is.
2. You should output the translations of all paragraphs while preserving the original `%% Paragraph <index>` dividers.
{{#if page}}3. Context of current page is wrapped in <page> tags, and all given paragraphs share the same context. Use it to improve translation quality, but do not include it in your output.{{/if}}
</format>

<example>
@@ INPUT 1 @@

{{#if page}}<page>
Title: Example Page
Description: This is an example page for translation.
</page>{{/if}}

%% Paragraph 0
Hello, world!

%% Paragraph 1
This is a sample text.

@@ OUTPUT 1 @@

%% Paragraph 0
こんにちは、世界！

%% Paragraph 1
これはサンプルテキストです。

@@ INPUT 2 @@

{{#if page}}<page>
Title: Prove 1 + 1 = 2
Description: A mathematical proof for the equation 1 + 1 = 2.
</page>{{/if}}

%% Paragraph 0
To prove that $1 + 1 = 2$, we start with the definition of addition:

%% Paragraph 1
Let $a$ and $b$ be two numbers. The sum $a + b$ is defined as the **total** quantity obtained by combining $a$ and $b$ ...

@@ OUTPUT 2 @@

%% Paragraph 0
为了证明 $1 + 1 = 2$，我们从加法的定义开始：

%% Paragraph 1
令 $a$ 和 $b$ 为两个数。和 $a + b$ 定义为将 $a$ 和 $b$ 结合后得到的**总**数量...

</example>