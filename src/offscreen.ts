function isDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Notify the service worker as soon as this document is loaded.
chrome.runtime.sendMessage({ type: "DARK_MODE_READY", prefersDark: isDark() });

// Handle direct queries from the service worker when the document is already
// open (no DARK_MODE_READY will fire in that case).
chrome.runtime.onMessage.addListener(
  (
    message: { type: string },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: { prefersDark: boolean }) => void,
  ) => {
    if (message.type === "GET_DARK_MODE") {
      sendResponse({ prefersDark: isDark() });
      return false;
    }
  },
);
