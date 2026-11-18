const $ = (id) => document.getElementById(id);
const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;

document.documentElement.lang = chrome.i18n.getUILanguage();
document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
let current = null;
let host = null;

function flash(msg) {
  $("status").textContent = msg;
  setTimeout(() => { $("status").textContent = ""; }, 1800);
}

function render() {
  $("enabled").checked = current.enabled;
  $("mode").value = current.mode;
  $("blockWholePage").checked = current.blockWholePage;
  $("aggressive").checked = current.aggressive;
  $("keywords").value = current.keywords.join("\n");
  const paused = host && current.pausedSites.includes(host);
  $("pause").textContent = paused ? t("resumeSite") : t("pauseSite");
  $("pause").disabled = !host;
}

function save(patch, msg) {
  Object.assign(current, patch);
  chrome.storage.sync.set(current, () => { render(); flash(msg || t("saved")); });
}

chrome.storage.sync.get(GTA6_DEFAULTS, (s) => {
  current = Object.assign({}, GTA6_DEFAULTS, s);
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    try {
      const u = new URL(tab.url);
      if (u.protocol.startsWith("http")) host = u.hostname.replace(/^www\./, "");
    } catch {}
    render();
    if (tab) {
      chrome.runtime.sendMessage({ type: "gta6-get-total", tabId: tab.id }, (res) => {
        void chrome.runtime.lastError;
        if (res) $("count").textContent = res.count;
      });
    }
  });
});

$("enabled").addEventListener("change", (e) => save({ enabled: e.target.checked }, e.target.checked ? t("statusOn") : t("statusOff")));
$("mode").addEventListener("change", (e) => save({ mode: e.target.value }, t("modeSaved")));
$("blockWholePage").addEventListener("change", (e) => save({ blockWholePage: e.target.checked }));
$("aggressive").addEventListener("change", (e) => save({ aggressive: e.target.checked }, e.target.checked ? t("aggressiveOn") : t("aggressiveOff")));

$("save").addEventListener("click", () => {
  const keywords = $("keywords").value.split("\n").map((k) => k.trim()).filter(Boolean);
  save({ keywords: Array.from(new Set(keywords)) }, t("keywordsSaved", [String(keywords.length)]));
});

$("pause").addEventListener("click", () => {
  if (!host) return;
  const list = new Set(current.pausedSites);
  const wasPaused = list.has(host);
  wasPaused ? list.delete(host) : list.add(host);
  save({ pausedSites: Array.from(list) }, wasPaused ? t("resumedOn", [host]) : t("pausedOn", [host]));
});
