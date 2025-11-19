<instruction>Output an array of length {{text.length}}</instruction>
{{#if page}}<page>
{{#for item:page}}{{@key}}: {{item}}{{/for}}
</page>{{/if}}

{{#for item:text}}
%% Paragraph {{@key}}
{{item}}
{{/for}}