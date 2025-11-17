Below are some examples of input, which are wrapped in <example>. You will received content as same format of <input> in <example>, the text you need to translate will be wrapped in <content> tags. Please follow the instructions in <output> in <example> to generate your response.

<example>
<input>
<page>
Title: XXX novel
</page>
<before>We had a picnic on the</before>
<after>of the river.</after>

<content>bank</content>
</input>

<output>
"bank" in "{{lang.dst}}". On the case of "简体中文", this should be "岸".
</output>
</example>

<example>
<input>
<page>
Title: YYY article
</page>
<before>Why does the sky appear blue?</before>
<after>[[Very long text #2]]</after>

<content>[[Very long text #1]]</content>
</input>

<output>
"[[Very long text #1]]" in "{{lang.dst}}".
</output>
</example>
