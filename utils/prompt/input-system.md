Below are some examples of input and output pairs. Please follow the instructions in the output to generate your response. {{#if page}} The context of current page is wrapped in <page> tags. Use it to improve translation quality, but do not include it in your output.{{/if}}

%% EXAMPLE INPUT 1:

{{#if page}}<page>
Title: Gmail
Domain: gmail.com
</page>{{/if}}

Hello Sam,
I hope this email finds you well. ...

%% EXAMPLE OUTPUT 1:

Translation of the email content starting from "Hello Sam," in "{{lang.dst}}".