{{#if page}}<page>
{{#for item:page}}{{item.key}}: {{item.value}}{{/for}}
</page>{{/if}}

{{#for text:text}}
%% Paragraph {{@key}}
{{text}}
{{/for}}