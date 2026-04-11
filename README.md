# Bookmark as Markdown — Chrome Extension

A Chrome extension for bookmarking the current page as a Markdown file. Each bookmark captures the page metadata and a clean, readable version of the article content — stripped of navigation, ads, and boilerplate.

**[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/mimcmogdjmmenflgmbibdmjlncgipkla)**

## How it works

Click the extension icon. The popup extracts the page content, shows a preview card, and lets you add custom tags before saving.

By default the file is downloaded directly to your browser's downloads folder. In the Options page you can switch to server mode — see [Custom Integration](#custom-integration) below.

Each saved page is a Markdown file with YAML front matter:

```yaml
---
title: I Made Eustace... But He Looks WAY Too Real
url: https://www.youtube.com/watch?v=KeVjhSYMJTo&t=2s
description: In this video, I take Eustace Bagge from Courage the Cowardly Dog…
  and turn him into something way more disturbing.What would Eustace actually
  look like in r...
image: https://i.ytimg.com/vi/KeVjhSYMJTo/maxresdefault.jpg
tags: [moore-art, eustace, cowardly dog, clay]
customTags: [clay, inspiring, hobbies]
---
# Article content in Markdown...
```

## Custom Integration

In Options, switch to server mode and enter your server's base URL (default: `http://localhost:3000`). The extension will send bookmarks directly to your server instead of downloading them to your browser's downloads folder.

See [server.md](docs/server.md) for the full API contract, CORS requirements, and an example implementation.

## Privacy

Bookmark as Markdown does not collect, store, or transmit any personal data. The extension reads the content of the active tab solely to generate a local Markdown file at the moment you click Save. No data is retained by the extension after that action completes.

No data is shared with third parties. The extension has no analytics, no telemetry, and no external services of its own.

If you configure the extension to send files to your own server, the Markdown file is sent directly from your browser to the URL you provide. That server is operated by you, not by this extension.

Your preferences (save mode and server URL) are stored in your browser's synced extension storage using the `chrome.storage.sync` API. This data is managed by your browser and may sync across your signed-in devices.

## License

GNU Affero General Public License v3.0. See [LICENSE](LICENSE) for details.
