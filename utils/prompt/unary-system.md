Below are some examples of input and output pairs. Please follow the instructions in the output to generate your response. {{#if page}} The context of current page is wrapped in <page> tags. Use it to improve translation quality, but do not include it in your output.{{/if}}

%% EXAMPLE INPUT 1:

{{#if page}}<page>
Title: XXX novel
</page>{{/if}}

We had a picnic by the <target>bank</target> of the river.

%% EXAMPLE OUTPUT 1:

岸

%% EXAMPLE INPUT 2:

{{#if page}}<page>
Title: YYY article
</page>{{/if}}
Why does the sky appear blue?

<target>[[Very long text #1]]</target> [[Very long text #2]] ... [[Very long text #N]]

%% EXAMPLE OUTPUT 2:

"[[Very long text #1]]" in "{{lang.dst}}".
