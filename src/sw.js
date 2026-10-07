// Suspend background tabs of windows that are being restored.
// - At browser start: a global 120 s window covers the startup session restore.
// - Any new window (e.g. a restored/reopened window) is armed individually, so
//   its background tabs are suspended no matter when it appears.
// The active tab in each window is never discarded.
const STARTUP_MS = 120000;
const ARM_MS = 15000;
const EXTEND_MS = 10000;

let startupUntil = 0;
const armed = new Map(); // windowId -> deadline

const saveArmed = () => chrome.storage.session.set({ armed: [...armed] });
const arm = (id, until) => { armed.set(id, until); saveArmed(); };

chrome.storage.session.get(['until', 'armed']).then(o => {
  if (o.until) startupUntil = Math.max(startupUntil, o.until);
  const now = Date.now();
  for (const [id, t] of o.armed || []) if (t > now) armed.set(id, t);
});

const openStartupWindow = async () => { startupUntil = Date.now() + STARTUP_MS; await chrome.storage.session.set({ until: startupUntil }); };
chrome.runtime.onStartup.addListener(openStartupWindow);
chrome.runtime.onInstalled.addListener(openStartupWindow);

chrome.windows.onCreated.addListener(w => { if (w.id != null) arm(w.id, Date.now() + ARM_MS); });
chrome.windows.onRemoved.addListener(id => { if (armed.delete(id)) saveArmed(); });

chrome.tabs.onUpdated.addListener((id, info, tab) => {
  if (info.status !== 'loading') return;
  const until = Math.max(Date.now() < startupUntil ? startupUntil : 0, armed.get(tab.windowId) || 0);
  if (!until || Date.now() >= until || tab.active || !/^https?:/i.test(tab.url || '')) return;
  chrome.tabs.discard(tab.id).then(
    () => armed.set(tab.windowId, Date.now() + EXTEND_MS), // keep arming while a restore is trickling in
    e => console.warn('startup-tab-suspender: discard failed', tab.id, e)
  );
});
