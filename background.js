// Keeps how many GTA 6 items were hidden per tab (summed over all frames),
// shows it on the icon badge and gives it to the popup.
// Stored in chrome.storage.session so it survives the service worker going to sleep.

// Updates run one at a time so frames reporting together don't overwrite each other.
let queue = Promise.resolve();

async function getCounts() {
  const { counts } = await chrome.storage.session.get({ counts: {} });
  return counts;
}

function total(frames) {
  return Object.values(frames || {}).reduce((a, b) => a + b, 0);
}

async function setBadge(tabId, n) {
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#ff5fa2" });
    await chrome.action.setBadgeText({ tabId, text: n ? (n > 999 ? "999+" : String(n)) : "" });
  } catch {} // tab already closed
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "gta6-count" && sender.tab) {
    queue = queue.then(async () => {
      const counts = await getCounts();
      const tabId = String(sender.tab.id);
      counts[tabId] = counts[tabId] || {};
      counts[tabId][sender.frameId || 0] = msg.count;
      await chrome.storage.session.set({ counts });
      await setBadge(sender.tab.id, total(counts[tabId]));
    }).catch(() => {});
    return;
  }
  if (msg && msg.type === "gta6-get-total") {
    getCounts().then((counts) => sendResponse({ count: total(counts[String(msg.tabId)]) }));
    return true; // async response
  }
});

function clearTab(tabId) {
  queue = queue.then(async () => {
    const counts = await getCounts();
    delete counts[String(tabId)];
    await chrome.storage.session.set({ counts });
  }).catch(() => {});
  return queue;
}

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "loading" && info.url) clearTab(tabId).then(() => setBadge(tabId, 0));
});

chrome.tabs.onRemoved.addListener((tabId) => { clearTab(tabId); });
