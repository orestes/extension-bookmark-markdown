import { SaveMode } from "./settings";

const DEFAULT_ENDPOINT = "http://localhost:3000";
const DEFAULT_SAVE_MODE = SaveMode.Download;

const form = document.getElementById("settings-form") as HTMLFormElement;
const endpointField = document.getElementById("endpoint-field") as HTMLElement;
const endpointInput = document.getElementById("endpoint") as HTMLInputElement;
const serverNote = document.getElementById("server-note") as HTMLElement;
const statusEl = document.getElementById("status") as HTMLElement;
const saveModeInputs = document.querySelectorAll<HTMLInputElement>(
  'input[name="saveMode"]',
);
const submitBtn = document.getElementById("submit-btn") as HTMLButtonElement;
const resetBtn = document.getElementById("reset-btn") as HTMLButtonElement;

let fadeTimeout: ReturnType<typeof setTimeout> | undefined;

function getSelectedMode(): SaveMode {
  const checked = document.querySelector<HTMLInputElement>(
    'input[name="saveMode"]:checked',
  );
  return checked?.value === SaveMode.Server
    ? SaveMode.Server
    : SaveMode.Download;
}

function updateModeVisibility(mode: SaveMode): void {
  const isServer = mode === SaveMode.Server;
  endpointInput.required = isServer;
  serverNote.hidden = !isServer;
  endpointField.hidden = !isServer;
}

function showStatus(message: string, success = false): void {
  clearTimeout(fadeTimeout);
  statusEl.classList.remove("fading", "success");
  statusEl.textContent = message;
  if (success) {
    statusEl.classList.add("success");
    fadeTimeout = setTimeout(() => {
      statusEl.classList.add("fading");
    }, 2000);
  }
}

function applyDefaults(): void {
  endpointInput.value = DEFAULT_ENDPOINT;
  const radio = document.querySelector<HTMLInputElement>(
    `input[name="saveMode"][value="${DEFAULT_SAVE_MODE}"]`,
  );
  if (radio) radio.checked = true;
  updateModeVisibility(DEFAULT_SAVE_MODE);
}

chrome.storage.sync.get(["endpoint", "saveMode"], ({ endpoint, saveMode }) => {
  endpointInput.value =
    typeof endpoint === "string" && endpoint ? endpoint : DEFAULT_ENDPOINT;
  const mode: SaveMode =
    saveMode === SaveMode.Server ? SaveMode.Server : SaveMode.Download;
  const radio = document.querySelector<HTMLInputElement>(
    `input[name="saveMode"][value="${mode}"]`,
  );
  if (radio) radio.checked = true;
  updateModeVisibility(mode);
});

saveModeInputs.forEach((input) => {
  input.addEventListener("change", () =>
    updateModeVisibility(getSelectedMode()),
  );
});

resetBtn.addEventListener("click", () => {
  applyDefaults();
  chrome.storage.sync.set(
    { saveMode: DEFAULT_SAVE_MODE, endpoint: DEFAULT_ENDPOINT },
    () => {
      showStatus("Reset to defaults", true);
    },
  );
});

async function checkHealth(endpoint: string): Promise<string> {
  const response = await fetch(`${endpoint}/health`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (typeof data?.version !== "string") throw new Error("missing version");
  return data.version;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const saveMode = getSelectedMode();

  if (saveMode === SaveMode.Download) {
    chrome.storage.sync.set({ saveMode }, () => {
      showStatus("Saved", true);
    });
    return;
  }

  const endpoint = endpointInput.value;
  showStatus("Checking…");
  submitBtn.disabled = true;

  let version: string;
  try {
    version = await checkHealth(endpoint);
  } catch {
    const link = document.createElement("a");
    link.href = `${endpoint}/health`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `${endpoint}/health`;
    statusEl.textContent = "Server unreachable — check ";
    statusEl.appendChild(link);
    submitBtn.disabled = false;
    return;
  }

  chrome.storage.sync.set({ endpoint, saveMode }, () => {
    showStatus(`Saved — server v${version}`, true);
    submitBtn.disabled = false;
  });
});
