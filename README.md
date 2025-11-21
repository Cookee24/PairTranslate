<div style="text-align: center;">
    <img src="./assets/icon.png" alt="Pair Translate" width="128" height="128"/>
    <h1>Pair Translate</h1>
</div>

A browser extension to translate text on web pages, append the translated text to the original text, allowing users to see both versions side by side.

Supports major translation platforms and LLMs, including Google Translate, Bing, DeepL, ChatGPT, Claude, Gemini, etc.

[Architecture Overview (DeepWiki)](https://deepwiki.com/Cookee24/PairTranslate)

### Features

- **Private & Secure**: All translations are processed locally in your browser. No data is collected or stored.

- **Dual Translation Modes**: Choose between side-by-side parallel translation (view both original and translated text simultaneously) or traditional replace mode (hide original text)

- **Multiple Selection Modes**: Support for word-level, paragraph-level, and full-page translation modes, providing flexible and intuitive user experience

- **Markdown-First Approach**: Optimized for large language models with concise context. Supports mathematical formula parsing and allows copying translations in markdown format

- **Intelligent Caching & Batch Processing**: Automatic caching of translations combined with batch processing to minimize context usage and achieve lower latency

- **Input Field Translation**: One-click translation of text already entered in input boxes and text areas

### Screenshots

| Side-by-Side Mode                         | Replace Mode                         |
| ----------------------------------------- | ------------------------------------ |
| ![Side-by-Side Mode](./screenshots/1.png) | ![Replace Mode](./screenshots/2.png) |

| Markdown Copy                         | Selection Translation                         |
| ------------------------------------- | --------------------------------------------- |
| ![Markdown Copy](./screenshots/3.png) | ![Selection Translation](./screenshots/4.png) |

| Input Field Translation                         | Settings Page                         |
| ----------------------------------------------- | ------------------------------------- |
| ![Input Field Translation](./screenshots/5.png) | ![Settings Page](./screenshots/6.png) |

### Installation

| Browser | Store                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------ |
| Chrome  | [Chrome Web Store](https://chromewebstore.google.com/detail/pair-translate/jpjodbfcidhificogpbddmappeioodea)                                                                                 |
| Firefox | [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/pair-translate/)                                  |
| Edge    | [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/mhnjhanomaajlmdlnilhgkhaeldhkkgp) |

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
