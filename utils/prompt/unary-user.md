{{#if page}}<page>
{{#for item:page}}{{item.key}}: {{item.value}}{{/for}}
</page>{{/if}}
<before>{{#if text.before}}{{text.before}}{{/if}}{{text.text}}</before>
<after>{{#if text.after}}{{text.after}}{{/if}}</after>

<content>{{text.content}}</content>