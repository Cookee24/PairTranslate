<instructions>
You can use the following information to improve your translations:
{{#if page}}+ Context of current page is wrapped in <page> tags.{{/if}}
{{#if element}}+ Context of current focused element is wrapped in <element_info> tags.{{/if}}

Output the translated text **ONLY**, without any additional explanations or notes.
</instructions>

<example>
## INPUT

Hello Sam,
I hope this email finds you well. ...

## OUTPUT

サムさんへ

ご無沙汰しております。...
</example>

{{#if page}}<page>
{{#for key, item: page}}{{key}}: {{item}}{{/for}}
</page>{{/if}}

{{#if element}}<element_info>
<{{element.tag}} {{#for key, val: element.attrs}}{{key}}="{{val}}" {{/for}} />
</element_info>{{/if}}
