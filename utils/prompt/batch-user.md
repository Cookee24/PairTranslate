<instruction>Output an array of length {{text.length}}</instruction>
{{#if page}}<page>
{{#for key, item: page}}{{key}}: {{item}}{{/for}}
</page>{{/if}}

{{#for idx, item: text}}
%% Paragraph {{idx}}
{{item}}
{{/for}}