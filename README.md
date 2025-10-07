<div style="text-align: center;">
    <img src="./assets/icon.png" alt="Pair Translate" width="128" height="128"/>
    <h1>Pair Translate</h1>
</div>

A browser extension to translate text on web pages, append the translated text to the original text, allowing users to see both versions side by side.

Supports major translation platforms and LLMs, including Google Translate, Bing, DeepL, ChatGPT, Claude, Gemini, etc.

### Features

+ In-line translation: Translated text is appended next to the original text for easy comparison.
+ Auto-caching and batching: Reduces redundant requests, speeds up translation and more context-effective.
+ Selection-based translation: Translate/Explain only the text you select.

### Development

1. Install [Bun](https://bun.sh/).
2. Clone this repository.
3. Run the following commands:
```bash
bun i
bun run dev
```

### Privacy

This extension is fully open-source. No data is collected and all of it is processed locally. All translation requests are sent directly from your browser to the translation service provider.

### License

[GPL-3.0 License](./LICENSE)
