type IconSet = { [size: string]: ImageData };
type IconVariant = "enabled" | "disabled" | "enabled-dark" | "disabled-dark";

async function loadIconSet(variant: IconVariant): Promise<IconSet> {
  const sizes = [16, 32, 48, 128];
  const entries = await Promise.all(
    sizes.map(async (size) => {
      const url = chrome.runtime.getURL(`icons/${variant}-${size}.png`);
      const response = await fetch(url);
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(size, size);
      const ctx = canvas.getContext("2d");
      if (!ctx)
        throw new Error(`Failed to get 2d context for ${variant}-${size}`);
      ctx.drawImage(bitmap, 0, 0);
      return [String(size), ctx.getImageData(0, 0, size, size)] as const;
    }),
  );
  return Object.fromEntries(entries);
}

// Cache is per service worker activation — reset on each wake.
let iconData: {
  enabled: IconSet;
  disabled: IconSet;
  "enabled-dark": IconSet;
  "disabled-dark": IconSet;
} | null = null;

async function getIconData(): Promise<NonNullable<typeof iconData>> {
  if (!iconData) {
    const [enabled, disabled, enabledDark, disabledDark] = await Promise.all([
      loadIconSet("enabled"),
      loadIconSet("disabled"),
      loadIconSet("enabled-dark"),
      loadIconSet("disabled-dark"),
    ]);
    iconData = {
      enabled,
      disabled,
      "enabled-dark": enabledDark,
      "disabled-dark": disabledDark,
    };
  }
  return iconData;
}

// Deduplicates concurrent createDocument calls within one service worker
// activation. onActivated and onUpdated both fire on every navigation, so
// without this guard the second concurrent call would throw and leave the
// icon permanently disabled.
let offscreenReady: Promise<boolean> | null = null;

async function prefersDark(): Promise<boolean> {
  const hasDoc = await chrome.offscreen.hasDocument();

  if (hasDoc) {
    // Document already loaded — query it directly.
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_DARK_MODE" }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(false);
          return;
        }
        resolve(response?.prefersDark ?? false);
      });
    });
  }

  if (!offscreenReady) {
    // Register the listener BEFORE creating the document so we cannot miss
    // the DARK_MODE_READY message the offscreen script sends on load.
    offscreenReady = new Promise<boolean>((resolve) => {
      const listener = (message: { type: string; prefersDark?: boolean }) => {
        if (message.type !== "DARK_MODE_READY") return;
        chrome.runtime.onMessage.removeListener(listener);
        resolve(message.prefersDark ?? false);
      };
      chrome.runtime.onMessage.addListener(listener);
    });

    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL("offscreen.html"),
      reasons: [chrome.offscreen.Reason.MATCH_MEDIA],
      justification: "Detect prefers-color-scheme: dark media query",
    });
  }

  return offscreenReady;
}

async function updateActionState(
  tabId: number,
  url: string | undefined,
): Promise<void> {
  const [icons, dark] = await Promise.all([getIconData(), prefersDark()]);
  if (!url || (!url.startsWith("https://") && !url.startsWith("http://"))) {
    await chrome.action.disable(tabId);
    await chrome.action.setIcon({
      tabId,
      imageData: dark ? icons["disabled-dark"] : icons.disabled,
    });
  } else {
    await chrome.action.enable(tabId);
    await chrome.action.setIcon({
      tabId,
      imageData: dark ? icons["enabled-dark"] : icons.enabled,
    });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.disable();
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    updateActionState(tabId, tab.url).catch(console.error);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    updateActionState(tabId, tab.url).catch(console.error);
  }
});
