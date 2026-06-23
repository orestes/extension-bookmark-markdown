import Choices from "choices.js";
import "choices.js/public/assets/styles/choices.min.css";
import { injectTagsIntoMarkdown } from "./frontmatter";
import { SaveMode } from "./settings";

const CLOSE_DURATION_MS = 1200;

let currentMarkdown: string | null = null;
let currentFilename: string | null = null;
let choicesInstance: Choices | null = null;
let pendingOverwrite: (() => Promise<void>) | null = null;

interface BookmarkMeta {
  title: string;
  description: string;
  image: string;
  url: string;
  savedAt: string;
}

function getElement<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function closeWithProgress(label: string): void {
  const saveButton = getElement<HTMLButtonElement>("save");
  saveButton.textContent = label;
  saveButton.disabled = true;
  saveButton.dataset.state = "closing";
  saveButton.style.setProperty("--close-duration", `${CLOSE_DURATION_MS}ms`);
  saveButton.addEventListener("animationend", () => window.close(), {
    once: true,
  });
}

async function extractBookmark(): Promise<{
  markdown: string;
  filename: string;
  meta: BookmarkMeta;
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id! },
    files: ["content.js"],
  });

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id! },
    func: () =>
      [
        (window as any).__bookmarkMarkdown,
        (window as any).__bookmarkFilename,
        (window as any).__bookmarkMeta,
      ] as [string, string, BookmarkMeta],
  });

  const [markdown, filename, meta] = result ?? [];
  if (!markdown || !filename || !meta) return null;
  return { markdown, filename, meta };
}

function getEndpoint(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.sync.get("endpoint", ({ endpoint }) => {
      resolve(typeof endpoint === "string" && endpoint ? endpoint : null);
    });
  });
}

interface ConflictInfo {
  slug: string;
  frontmatter: { title?: string; savedAt?: string };
}

function buildBookmarkBody(markdown: string, filename: string): FormData {
  const file = new File([markdown], filename, { type: "text/markdown" });
  const body = new FormData();
  body.append("file", file);
  return body;
}

async function requireEndpoint(): Promise<string> {
  const endpoint = await getEndpoint();
  if (!endpoint) throw new Error("No endpoint configured");
  return endpoint;
}

async function saveBookmark(
  markdown: string,
  filename: string,
): Promise<Response> {
  const endpoint = await requireEndpoint();
  return fetch(endpoint, {
    method: "POST",
    body: buildBookmarkBody(markdown, filename),
  });
}

async function overwriteBookmark(
  markdown: string,
  filename: string,
  slug: string,
): Promise<Response> {
  const endpoint = await requireEndpoint();
  return fetch(`${endpoint}/${slug}`, {
    method: "PUT",
    body: buildBookmarkBody(markdown, filename),
  });
}

function downloadBookmark(markdown: string, filename: string): void {
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getSaveMode(): Promise<SaveMode> {
  return new Promise((resolve) => {
    chrome.storage.sync.get("saveMode", ({ saveMode }) => {
      resolve(
        saveMode === SaveMode.Server ? SaveMode.Server : SaveMode.Download,
      );
    });
  });
}

function renderPreview(meta: BookmarkMeta): void {
  const domain = new URL(meta.url).hostname;

  if (meta.image) {
    const img = getElement<HTMLImageElement>("preview-image");
    img.src = meta.image;
    img.hidden = false;
  }

  getElement("preview-domain").textContent = domain;
  getElement("preview-title").textContent = meta.title;
  getElement("preview-description").textContent = meta.description;
}

function initTagsInput(): void {
  choicesInstance = new Choices(getElement<HTMLInputElement>("tags-input"), {
    delimiter: ",",
    editItems: true,
    maxItemCount: -1,
    removeItemButton: true,
    duplicateItemsAllowed: false,
    placeholder: true,
    placeholderValue: "Add tag…",
  });

  getElement("tags-section").hidden = false;
  choicesInstance.input.element.focus();
}

async function onExtract(): Promise<void> {
  const saveButton = getElement<HTMLButtonElement>("save");
  const [result, saveMode] = await Promise.all([
    extractBookmark(),
    getSaveMode(),
  ]);

  currentMarkdown = result?.markdown ?? null;
  currentFilename = result?.filename ?? null;
  saveButton.textContent = saveMode === SaveMode.Server ? "Send" : "Download";
  saveButton.disabled = !currentMarkdown;

  if (result?.meta) {
    renderPreview(result.meta);
    initTagsInput();
  }
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * 24 * 60 * 60],
    ["month", 30 * 24 * 60 * 60],
    ["week", 7 * 24 * 60 * 60],
    ["day", 24 * 60 * 60],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, threshold] of units) {
    if (Math.abs(seconds) >= threshold) {
      return rtf.format(Math.round(seconds / threshold), unit);
    }
  }
  return rtf.format(seconds, "second");
}

function formatSavedAt(iso: string): string {
  const date = new Date(iso);
  const absolute = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
  const relative = formatRelativeTime(date);
  return `${absolute} (${relative})`;
}

function showConflict(
  conflict: ConflictInfo,
  markdown: string,
  filename: string,
): void {
  const saveButton = getElement<HTMLButtonElement>("save");
  const conflictEl = getElement("save-conflict");
  const cancelBtn = getElement<HTMLButtonElement>("cancel");

  const title = conflict.frontmatter?.title ?? "this URL";
  const savedAt = conflict.frontmatter?.savedAt;
  conflictEl.textContent = savedAt
    ? `"${title}" was saved on ${formatSavedAt(savedAt)}.`
    : `"${title}" was already saved.`;
  conflictEl.hidden = false;

  saveButton.textContent = "Overwrite";
  saveButton.dataset.state = "error";
  saveButton.disabled = false;

  cancelBtn.hidden = false;
  cancelBtn.onclick = () => window.close();

  pendingOverwrite = () => handleOverwrite(conflict.slug, markdown, filename);
}

async function handleOverwrite(
  slug: string,
  markdown: string,
  filename: string,
): Promise<void> {
  const saveButton = getElement<HTMLButtonElement>("save");
  const conflictEl = getElement("save-conflict");
  const cancelBtn = getElement<HTMLButtonElement>("cancel");

  saveButton.disabled = true;
  saveButton.textContent = "Overwriting…";
  saveButton.dataset.state = "saving";

  let response: Response;
  try {
    response = await overwriteBookmark(markdown, filename, slug);
  } catch (err) {
    saveButton.disabled = false;
    saveButton.textContent = "Overwrite";
    saveButton.dataset.state = "error";
    // Surface unexpected fetch failures (e.g. extension bug, malformed request)
    throw err;
  }

  if (!response.ok) {
    saveButton.textContent = `Error ${response.status}`;
    saveButton.dataset.state = "error";
    return;
  }

  conflictEl.hidden = true;
  cancelBtn.hidden = true;
  pendingOverwrite = null;
  closeWithProgress("Sent");
}

async function sendToServer(markdown: string, filename: string): Promise<void> {
  const saveButton = getElement<HTMLButtonElement>("save");

  saveButton.textContent = "Sending…";
  const response = await saveBookmark(markdown, filename);

  if (response.status === 409) {
    const conflict: ConflictInfo = await response.json();
    showConflict(conflict, markdown, filename);
    return;
  }

  if (!response.ok) {
    saveButton.textContent = `Error ${response.status}`;
    saveButton.dataset.state = "error";
    return;
  }

  closeWithProgress("Sent");
}

async function onSubmit(): Promise<void> {
  if (pendingOverwrite) {
    await pendingOverwrite();
    return;
  }

  if (!currentMarkdown || !currentFilename) return;

  const saveButton = getElement<HTMLButtonElement>("save");
  saveButton.disabled = true;
  saveButton.dataset.state = "saving";

  const errorEl = getElement("save-error");
  errorEl.hidden = true;
  errorEl.textContent = "";

  getElement("save-conflict").hidden = true;

  const tags = choicesInstance
    ? (choicesInstance.getValue(true) as string[])
    : [];
  const markdown = injectTagsIntoMarkdown(currentMarkdown, tags);
  const saveMode = await getSaveMode();

  try {
    if (saveMode === SaveMode.Download) {
      saveButton.textContent = "Downloading…";
      downloadBookmark(markdown, currentFilename);
      closeWithProgress("Downloaded");
      return;
    }

    await sendToServer(markdown, currentFilename);
  } catch {
    // Expected when the server is unreachable; handled via the UI message
    saveButton.dataset.state = "error";
    saveButton.textContent = "Failed";
    saveButton.disabled = false;
    errorEl.textContent =
      "Could not reach the server. Check your endpoint in settings.";
    errorEl.hidden = false;
  }
}

const form = getElement<HTMLFormElement>("popup-form");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  onSubmit().catch(console.error);
});

// Choices.js swallows Enter (calls preventDefault) and clears the input before
// bubble-phase listeners run. Use capture phase to read the input value first:
// if the tags input has text, let Choices.js add the tag; if empty, submit.
form.addEventListener(
  "keydown",
  (e) => {
    if (e.key !== "Enter") return;
    const choicesInput = choicesInstance?.input.element;
    if (document.activeElement === choicesInput && choicesInput!.value.trim()) {
      return;
    }
    form.requestSubmit();
  },
  true,
);

onExtract().catch(console.error);
