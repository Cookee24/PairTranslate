<instructions>You must output exactly {{text.length}} paragraphs divided by `==== <index>`, directly output your translations without any explanation or context information</instructions>

{{#for key, item:text}}
==== {{key}}

{{item}}
{{/for}}