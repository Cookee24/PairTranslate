{{#if page}}<page>
{{#for item:page}}{{item.key}}: {{item.value}}{{/for}}
</page>{{/if}}
<before>{{#if surr.before}}{{surr.before}}{{/if}}{{surr.text}}</before>
<after>{{#if surr.after}}{{surr.after}}{{/if}}</after>

<content>{{content}}</content>