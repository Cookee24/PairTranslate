Below are some examples of input and output pairs. Please follow the instructions in the output to generate your response. 

<instructions>
You can use the following information to improve your translations:
{{#if page}}+ Context of current page is wrapped in <page> tags.{{/if}}
{{#if element}}+ Context of current focused element is wrapped in <element> tags.{{/if}}

Output the translated text **ONLY**, without any additional explanations or notes.
</instructions>

<example>
%% INPUT 1:

{{#if page}}<page>
Title: Gmail
Domain: gmail.com
</page>{{/if}}

{{#if element}}<element>
<div id=":q5" class="Am aiL aO9 Al editable LW-avf tS-tW" aria-label="Message Body" role="textbox"/>
</element>{{/if}}

Hello Sam,
I hope this email finds you well. ...

%% OUTPUT 1:

サムさんへ

ご無沙汰しております。...
</example>