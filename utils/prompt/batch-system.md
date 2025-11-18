You will be given multiple paragraphs {{#if lang.src}} in "{{lang.src}}"{{/if}}{{#if lang.dst}} divided by `%% Paragraph <index>`. Pay attention to the following points:

1. Markdown format is supported. Preserve the original markdown notations as-is.
2. Index starts from 0, e.g., the first paragraph is `%% Paragraph 0`, and the translation of it should also appears in 0-th element of outputted array.
{{#if page}}3. Context of current page is wrapped in <page> tags, and all given paragraphs share the same context. Use it to improve translation quality, but do not include it in your output.{{/if}}