# Chrome Web Store — Submission Reference

Copy-paste reference for the Chrome Web Store developer dashboard.
Character limits are noted inline for each field.

---

## Name (75 chars max — current: 20)

```
Bookmark as Markdown
```

---

## Short description (132 chars max — current: 129)

```
Clip any webpage to a clean Markdown file with YAML front matter — ready to drop into Obsidian, Logseq, or your own server. No account required.
```

---

## Detailed description (16,000 chars max)

```
A one-click web clipper for Markdown-based knowledge tools. Save any webpage as a clean, readable Markdown file with YAML front matter — ready to drop into Obsidian, Logseq, or any local vault. No account, no sync service, no setup beyond installing the extension.

Each saved file contains a front matter block with the following fields:

<!-- Keep this example in sync with the one in README.md -->
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

The file body is the article content converted to clean Markdown using Mozilla Readability (to strip navigation, ads, and boilerplate) and Turndown (HTML to Markdown conversion).

WHO THIS IS FOR

If you run a personal knowledge base in Obsidian, Logseq, or a similar tool that reads from a local file system, this extension gives you a one-click path from any web page to a structured Markdown file ready to drop into your vault.

In server mode, the PUT request can feed directly into an ingestion pipeline — a local script, a home server, or an automation tool like n8n or Make — so saved pages are automatically processed, tagged, or routed without manual steps.

It is not a general-purpose bookmarking tool and has no built-in storage or sync.

HOW IT WORKS

Click the toolbar icon on any web page. A popup appears showing a preview card with the page thumbnail, domain, title, and description. Optionally add or remove custom tags using the tag input. Click Save. The file is saved and the popup closes automatically.

SAVE MODES

By default the extension downloads the Markdown file directly to your browser's downloads folder — no account, no server, no setup required.

If you prefer to send files to your own backend, switch to server mode in the Options page. Server requirements and integration details are documented in the project README on GitHub: https://github.com/orestes/extension-bookmark-markdown

WHERE IT WORKS

The toolbar icon is active on any HTTP or HTTPS page. On browser-internal pages such as the new tab page, settings pages, and extension pages the icon appears grayed out and cannot be used.
```

---

## Category

Productivity

---

## Keywords (up to 5)

```
markdown
bookmark
obsidian
notes
web clipper
```

---

## Screenshots

Requirements: 1280x800 or 640x400 pixels, PNG or JPEG, up to 5.
Recommended capture setup: 1280x800 browser window, light mode.

### Screenshot 1 — Popup, ready state (most important)

Show the popup fully loaded on an article page:

- OG thumbnail image displayed at the top of the preview card
- Domain in small gray text, bold article title, two-line truncated description
- Tag input below with "Add tag…" placeholder visible
- Save button active (blue)

### Screenshot 2 — Popup, tags added

Same popup with 2–3 tags entered as chips in the tag input. Save button still active.

### Screenshot 3 — Popup, saved state

Save button showing "Saved" — the confirmation state just before the popup auto-closes.

### Screenshot 4 — Options page, download mode

Options page with "Download file" radio selected. Endpoint field hidden.

### Screenshot 5 — Options page, server mode

Options page with "Send to server" selected, endpoint field populated with a realistic
non-personal URL (e.g. https://notes.example.com), status showing "Saved — server v1.2.0".

---

## Permission justifications

| Permission  | Justification                                                                                                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeTab` | Grants temporary access to the active tab when the user clicks the toolbar icon. This allows the scripting permission to inject a content script into that specific tab without requiring permanent broad host access.  |
| `offscreen` | Creates an offscreen document to perform HTML-to-Markdown conversion using Turndown outside of the service worker context, where DOM APIs are not available.                                                            |
| `scripting` | Injects the content script into the active tab to read the page DOM, extract article content using Mozilla Readability (stripping navigation, ads, and boilerplate), and convert it to Markdown with YAML front matter. |
| `storage`   | Persists user preferences (save mode and server URL) in synced browser storage so settings are retained across sessions and devices.                                                                                    |
| `tabs`      | Reads the URL of the active tab and listens for tab navigation events to enable or disable the toolbar icon — the icon is active only on HTTP/HTTPS pages and grayed out on browser-internal pages.                     |

---

## Privacy policy URL

```
https://github.com/orestes/extension-bookmark-markdown#privacy
```

---

## Notes

- Promotional tile (440x280) and marquee image (1400x560) are optional — can skip for initial submission
- The store description field renders plain text only; Markdown syntax will appear literally
