{{#if page}}<page>
{{#for key, item: page}}{{key}}: {{item}}{{/for}}
</page>{{/if}}

{{#if element}}<element>
<{{element.tag}} {{#for key, val: element.attrs}}{{key}}="{{val}}" {{/for}} />
</element>{{/if}}

{{text}}