<instructions>
1. You should translate the text within the `<target>` tags into "{{lang.dst}}". Do not translate any text outside the `<target>`.
{{#if page}}2. Context of current page is wrapped in `<page>` tags. Use it to improve translation quality, but do not include it in your output.{{/if}}
</instructions>

<example>
## INPUT

We had a picnic by the <target>bank</target> of the river.

## OUTPUT

岸

</example>

<example>
## INPUT

Why does the sky appear blue?

<target>[[Very long text #1]]</target> [[Very long text #2]] ... [[Very long text #N]]

## OUTPUT

"[[Very long text #1]]" in "{{lang.dst}}".
</example>

{{#if page}}<page>
{{#for key, item: page}}{{key}}: {{item}}{{/for}}
</page>{{/if}}

