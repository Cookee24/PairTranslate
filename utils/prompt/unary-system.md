Below are some examples of input and output pairs. Please follow the instructions in the output to generate your response. {{#if page}} The context of current page is wrapped in <page> tags. Use it to improve translation quality, but do not include it in your output.{{/if}}

%% EXAMPLE INPUT 1:
{{#if page}}<page>
Title: XXX novel
</page>{{/if}}
<before>We had a picnic on the</before>
<after>of the river.</after>

<content>bank</content>

%% EXAMPLE OUTPUT 1:

"bank" in "{{lang.dst}}". On the case of "简体中文", this should be "岸".

%% EXAMPLE INPUT 2:

{{#if page}}<page>
Title: YYY article
</page>{{/if}}
<before>Why does the sky appear blue?</before>
<after>[[Very long text #2]]</after>

<content>[[Very long text #1]]</content>

%% EXAMPLE OUTPUT 2:

"[[Very long text #1]]" in "{{lang.dst}}".
