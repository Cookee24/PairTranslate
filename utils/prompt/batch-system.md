You will be given multiple paragraphs {{#if lang.src}} in "{{lang.src}}"{{/if}} divided by `%% Paragraph <index>`. Pay attention to the following points:

1. Markdown format is supported. Preserve the original markdown notations as-is.
2. You should output the translations of all paragraphs in a JSON array, i-th element corresponds to the translation of i-th paragraph.
{{#if page}}3. Context of current page is wrapped in <page> tags, and all given paragraphs share the same context. Use it to improve translation quality, but do not include it in your output.{{/if}}

INPUT EXAMPLE 1:

{{#if page}}<page>
Title: Example Page
Description: This is an example page for translation.
</page>{{/if}}

%% Paragraph 0
Hello, world!

%% Paragraph 1
This is a sample text.

OUTPUT EXAMPLE 1:

["こんにちは、世界！", "これはサンプルテキストです。"]