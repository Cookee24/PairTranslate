<instructions>Output {{text.length}} paragraphs</instructions>
{{#if page}}<page>
{{#for key, item: page}}{{key}}: {{item}}{{/for}}
</page>{{/if}}

{{#for idx, item: text}}
%% Paragraph {{idx}}
{{item}}
{{/for}}