// Suspend background tabs of windows that are being restored.
// - At browser start: a global 120 s window covers the startup session restore.
// - Any new window (e.g. a restored/reopened window) is armed individually, so
//   its background tabs are suspended no matter when it appears.
// The active tab in each window is never discarded.
const STARTUP_MS = 120000;
const ARM_MS = 15000;
const EXTEND_MS = 10000;
const MAX_ARM_MS = 60000;

let startupUntil = 0;
const armed = new Map(); // windowId -> { since, until }

const saveArmed = () => {
  const now = Date.now();
  for (const [id, a] of armed) if (a.until <= now) armed.delete(id);
  return chrome.storage.session.set({ armed: [...armed] });
};
const arm = (id, since, until) => { armed.set(id, { since, until }); saveArmed(); };

chrome.storage.session.get(['until', 'armed']).then(o => {
  if (o.until) startupUntil = Math.max(startupUntil, o.until);
  const now = Date.now();
  for (const [id, a] of o.armed || []) if (a.until > now) armed.set(id, a);
});

const openStartupWindow = async () => { startupUntil = Date.now() + STARTUP_MS; await chrome.storage.session.set({ until: startupUntil }); };
chrome.runtime.onStartup.addListener(openStartupWindow);
chrome.runtime.onInstalled.addListener(openStartupWindow);

chrome.windows.onCreated.addListener(w => {
  if (w.id != null) { const now = Date.now(); arm(w.id, now, now + ARM_MS); }
});
chrome.windows.onRemoved.addListener(id => { armed.delete(id); saveArmed(); });

chrome.tabs.onUpdated.addListener((id, info, tab) => {
  if (info.status !== 'loading') return;
  const a = armed.get(tab.windowId);
  const until = Math.max(Date.now() < startupUntil ? startupUntil : 0, a ? a.until : 0);
  if (!until || Date.now() >= until || tab.active || !/^https?:/i.test(tab.url || '')) return;
  chrome.tabs.discard(tab.id).then(
    () => { const w = armed.get(tab.windowId); if (w) w.until = Math.min(Date.now() + EXTEND_MS, w.since + MAX_ARM_MS); },
    e => console.warn('startup-tab-suspender: discard failed', tab.id, e)
  );
});
