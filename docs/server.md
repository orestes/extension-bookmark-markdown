# Server Integration

This document describes the requirements for running a custom server to receive files from the Bookmark as Markdown extension.

## Overview

In Options, switch the save mode to **Server** and enter your server's base URL (default: `http://localhost:3000`). The extension will send bookmarks directly to your server instead of downloading them to your browser's downloads folder.

## Endpoints

Your server must implement the following two endpoints.

### `GET /health`

Used by the extension to verify the server is reachable and compatible.

**Response:** `200 OK` with JSON body:

```json
{ "version": "1.0.0" }
```

The `version` field is required. Its value is displayed in the extension popup as confirmation the server is connected.

### `PUT /file`

Receives a saved bookmark as a Markdown file.

**Request:** `multipart/form-data` with a single field:

| Field  | Type | Description                                                             |
| ------ | ---- | ----------------------------------------------------------------------- |
| `file` | File | The Markdown file to save. The filename is derived from the page title. |

**Response:** Any `2xx` status code is treated as success.

## CORS

The extension runs in a browser context and makes cross-origin requests to your server. Your server must include a CORS header in all responses.

```
Access-Control-Allow-Origin: chrome-extension://mimcmogdjmmenflgmbibdmjlncgipkla
```

The extension also sends a preflight `OPTIONS` request before `PUT /file`. Your server must respond to `OPTIONS` requests with the appropriate CORS headers:

```
Access-Control-Allow-Origin: chrome-extension://mimcmogdjmmenflgmbibdmjlncgipkla
Access-Control-Allow-Methods: PUT, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

If running the extension unpacked (developer mode), you must allow any origin (`*`) **on all endpoints**, as the extension id depends on the path where the source code is:

For all requests:

```
Access-Control-Allow-Origin: *
```

For the preflight `OPTIONS` request:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: PUT, OPTIONS
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

app.get("/health", (req, res) => {
  res.json({ version: "1.0.0" });
});

app.put("/file", upload.single("file"), (req, res) => {
  res.sendStatus(200);
});

app.listen(3000);
```
