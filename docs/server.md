# Server Integration

This document describes the requirements for running a custom server to receive files from the Bookmark as Markdown extension.

## Overview

In Options, switch the save mode to **Server** and enter your server's collection URL (e.g. `http://localhost:3000/api/bookmarks`). The extension validates the endpoint with an `OPTIONS` request before saving. Bookmarks are sent directly to your server instead of downloading to your browser's downloads folder.

## Endpoints

Your server must implement the following endpoints on the collection URL you configure.

### `OPTIONS {collection}`

Used by the extension to verify the endpoint is reachable and accepts bookmarks.

**Response:** `200 OK` (or `204 No Content`) with an `Allow` header that includes `POST`:

```
Allow: POST, PUT, OPTIONS
```

### `POST {collection}`

Creates a new bookmark.

**Request:** `multipart/form-data` with a single field:

| Field  | Type | Description                                                             |
| ------ | ---- | ----------------------------------------------------------------------- |
| `file` | File | The Markdown file to save. The filename is derived from the page title. |

**Response:**

| Status | Meaning                                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------------- |
| `2xx`  | Success.                                                                                                          |
| `409`  | The bookmarked URL already exists. Body: `{ "slug": "...", "frontmatter": { "title?": "...", "savedAt?": "..." } }` |

When the extension receives a `409`, it shows the user that this URL was already saved and offers to overwrite.

### `PUT {collection}/{slug}`

Overwrites an existing bookmark at a known slug (returned in the `409` response).

**Request:** Same `multipart/form-data` format as `POST`.

**Response:** Any `2xx` status code is treated as success.

## CORS

The extension runs in a browser context and makes cross-origin requests to your server. Your server must include CORS headers in all responses.

```
Access-Control-Allow-Origin: chrome-extension://mimcmogdjmmenflgmbibdmjlncgipkla
```

The extension sends preflight `OPTIONS` requests before `POST` and `PUT`. Your server must respond with:

```
Access-Control-Allow-Origin: chrome-extension://mimcmogdjmmenflgmbibdmjlncgipkla
Access-Control-Allow-Methods: POST, PUT, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

If running the extension unpacked (developer mode), you must allow any origin (`*`) **on all endpoints**, as the extension id depends on the path where the source code is:

For all requests:

```
Access-Control-Allow-Origin: *
```

For preflight `OPTIONS` requests:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, PUT, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## Example implementation

A minimal Node.js/Express server that satisfies these requirements:

```js
import express from "express";
import multer from "multer";
import cors from "cors";

const app = express();
const upload = multer({ dest: "bookmarks/" });

app.use(cors());

app.options("/api/bookmarks", (req, res) => {
  res.set("Allow", "POST, PUT, OPTIONS").sendStatus(204);
});

app.post("/api/bookmarks", upload.single("file"), (req, res) => {
  // Check for duplicate URL, return 409 if exists:
  // res.status(409).json({ slug: "existing-slug", frontmatter: { title: "...", savedAt: "..." } });
  res.sendStatus(201);
});

app.put("/api/bookmarks/:slug", upload.single("file"), (req, res) => {
  res.sendStatus(200);
});

app.listen(3000);
```
