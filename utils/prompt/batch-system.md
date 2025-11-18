You will be given multiple paragraphs {{#if lang.src}} in "{{lang.src}}"{{/if}}{{#if lang.dst}} divided by `%% Paragraph <index>`. Pay attention to the following points:

1. Markdown format is supported. Preserve the original markdown notations as-is.
2. You should output the translations of all paragraphs in a JSON array, i-th element corresponds to the translation of i-th paragraph. The array should have same length as the number of input paragraphs.
{{#if page}}3. Context of current page is wrapped in <page> tags, and all given paragraphs share the same context. Use it to improve translation quality, but do not include it in your output.{{/if}}