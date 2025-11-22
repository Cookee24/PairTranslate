## Operators

- `{{#if CONDITION}}...{{/if}}`: Conditional based on the truthiness of `CONDITION`.
- `{{#else}}...{{/else}}`: Else block for the preceding `if`.
- `{{#elif CONDITION}}...{{/elif}}`: Else-if block for the preceding `if`.
- `{{#for ITEM:COLLECTION}}...{{/for}}`: Loop over each `ITEM` in `COLLECTION`.
- `{{#for KEY, ITEM: COLLECTION}}...{{/for}}`: Loop with access to both `KEY` (index/property name) and `ITEM`.
- `{{variable}}`: Access the value of `variable`.
- `{{variable[N]}}`: Access the N-th element of `variable` if it's an array (0-based).
- `{{variable.key}}`: Access the property `key` of `variable`.

## Internal Functions

- `{{@toJSON value}}`: Stringify `value` into compact JSON.
- `{{@toJSONPretty value}}`: Stringify `value` into pretty-printed JSON.

## Variables
- `page`: An object containing key-value pairs for page-level context. Note: this is not predefined in implementation, but frontend will add that to context when available.
- `text`: Input text(s) to be processed. Can be a single string or an array of strings.
- `output[N]`: The output of step N, where N is the step index (0-based). can be accessed in subsequent steps.
- `lang.src`: Source language code (can be `auto`).
- `lang.dst`: Target language code.

## Escape Sequences

- `\{{`: Escape sequence for literal `{{`.
- `\}}`: Escape sequence for literal `}}`.
 