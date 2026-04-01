import Choices from "choices.js";
import "choices.js/public/assets/styles/choices.min.css";
import { stringify } from "yaml";
import { SaveMode } from "./settings";

const API_ENDPOINT = "http://localhost:3000";
const CLOSE_TIMEOUT = 0.3 * 1000; // in ms

let currentMarkdown: string | null = null;
let currentFilename: string | null = null;
let choicesInstance: Choices | null = null;

interface BookmarkMeta {
  title: string;
  description: string;
  image: string;
  url: string;
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

function getEndpoint(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get("endpoint", ({ endpoint }) => {
      resolve(
        typeof endpoint === "string" && endpoint ? endpoint : API_ENDPOINT,
      );
    });
  });
}

async function saveBookmark(
  markdown: string,
  filename: string,
): Promise<Response> {
  const endpoint = await getEndpoint();
  const file = new File([markdown], filename, { type: "text/markdown" });
  const body = new FormData();
  body.append("file", file);
  return fetch(endpoint, { method: "PUT", body });
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

function injectCustomTagsIntoMarkdown(
  markdown: string,
  customTags: string[],
): string {
  const customTagsYaml = stringify({ customTags }).trimEnd();

  // Insert customTags field before the closing --- of the front matter
  const closingPos = markdown.indexOf("\n---", 3);
  if (closingPos === -1) return markdown;

  return (
    markdown.slice(0, closingPos) +
    "\n" +
    customTagsYaml +
    markdown.slice(closingPos)
  );
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

async function onSave(): Promise<void> {
  if (!currentMarkdown || !currentFilename) return;

  const saveButton = getElement<HTMLButtonElement>("save");
  saveButton.disabled = true;
  saveButton.dataset.state = "saving";

  const errorEl = getElement("save-error");
  errorEl.hidden = true;
  errorEl.textContent = "";

  const customTags = choicesInstance
    ? (choicesInstance.getValue(true) as string[])
    : [];
  const markdown = injectCustomTagsIntoMarkdown(currentMarkdown, customTags);

  try {
    const saveMode = await getSaveMode();
    if (saveMode === SaveMode.Download) {
      saveButton.textContent = "Downloading…";
      downloadBookmark(markdown, currentFilename);
    } else {
      saveButton.textContent = "Sending…";
      const response = await saveBookmark(markdown, currentFilename);
      if (!response.ok) {
        saveButton.textContent = `Error ${response.status}`;
        saveButton.dataset.state = "error";
        return;
      }
    }
    saveButton.dataset.state = "saved";
    saveButton.textContent =
      saveMode === SaveMode.Download ? "Downloaded" : "Sent";
    setTimeout(() => window.close(), CLOSE_TIMEOUT);
  } catch {
    saveButton.dataset.state = "error";
    saveButton.textContent = "Failed";
    saveButton.disabled = false;
    const endpoint = await getEndpoint();
    const healthUrl = `${endpoint}/health`;
    const link = document.createElement("a");
    link.href = healthUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = healthUrl;
    errorEl.textContent = "Check if the server is live: ";
    errorEl.appendChild(link);
    errorEl.hidden = false;
  }
}

getElement("save").addEventListener("click", () =>
  onSave().catch(console.error),
);
onExtract().catch(console.error);
