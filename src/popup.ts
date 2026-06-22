import Choices from "choices.js";
import "choices.js/public/assets/styles/choices.min.css";
import { injectTagsIntoMarkdown } from "./frontmatter";
import { SaveMode } from "./settings";

const CLOSE_TIMEOUT = 0.3 * 1000; // in ms

let currentMarkdown: string | null = null;
let currentFilename: string | null = null;
let choicesInstance: Choices | null = null;

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

function showConflict(
  conflict: ConflictInfo,
  markdown: string,
  filename: string,
): void {
  const saveButton = getElement<HTMLButtonElement>("save");
  const conflictEl = getElement("save-conflict");
  const overwriteBtn = getElement<HTMLButtonElement>("overwrite");

  saveButton.dataset.state = "error";
  saveButton.textContent = "Already saved";
  saveButton.disabled = false;

  const title = conflict.frontmatter?.title ?? "this URL";
  const savedAt = conflict.frontmatter?.savedAt;
  conflictEl.textContent = savedAt
    ? `"${title}" was saved on ${savedAt}.`
    : `"${title}" was already saved.`;
  conflictEl.hidden = false;

  overwriteBtn.hidden = false;
  overwriteBtn.onclick = () =>
    handleOverwrite(conflict.slug, markdown, filename);
}

async function handleOverwrite(
  slug: string,
  markdown: string,
  filename: string,
): Promise<void> {
  const saveButton = getElement<HTMLButtonElement>("save");
  const conflictEl = getElement("save-conflict");
  const overwriteBtn = getElement<HTMLButtonElement>("overwrite");

  overwriteBtn.disabled = true;
  overwriteBtn.textContent = "Overwriting…";
  saveButton.dataset.state = "saving";
  saveButton.textContent = "Sending…";
  saveButton.disabled = true;

  let response: Response;
  try {
    response = await overwriteBookmark(markdown, filename, slug);
  } catch {
    saveButton.dataset.state = "error";
    saveButton.textContent = "Failed";
    overwriteBtn.disabled = false;
    overwriteBtn.textContent = "Overwrite";
    return;
  }

  if (!response.ok) {
    saveButton.textContent = `Error ${response.status}`;
    saveButton.dataset.state = "error";
    return;
  }

  conflictEl.hidden = true;
  overwriteBtn.hidden = true;
  saveButton.dataset.state = "saved";
  saveButton.textContent = "Sent";
  setTimeout(() => window.close(), CLOSE_TIMEOUT);
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

  saveButton.dataset.state = "saved";
  saveButton.textContent = "Sent";
  setTimeout(() => window.close(), CLOSE_TIMEOUT);
}

async function onSave(): Promise<void> {
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
      saveButton.dataset.state = "saved";
      saveButton.textContent = "Downloaded";
      setTimeout(() => window.close(), CLOSE_TIMEOUT);
      return;
    }

    await sendToServer(markdown, currentFilename);
  } catch {
    saveButton.dataset.state = "error";
    saveButton.textContent = "Failed";
    saveButton.disabled = false;
    errorEl.textContent =
      "Could not reach the server. Check your endpoint in settings.";
    errorEl.hidden = false;
  }
}

getElement("save").addEventListener("click", () =>
  onSave().catch(console.error),
);
onExtract().catch(console.error);
