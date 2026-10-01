const WINDOW_MS = 120000;
let until = 0;
chrome.storage.session.get('until').then(o => { if (o.until) until = Math.max(until, o.until); });
const openWindow = async () => { until = Date.now() + WINDOW_MS; await chrome.storage.session.set({until}); };
chrome.runtime.onStartup.addListener(openWindow);
chrome.runtime.onInstalled.addListener(openWindow);
const maybe = t => {
  if (Date.now() >= until || t.active || !/^https?:/i.test(t.url || '')) return;
  chrome.tabs.discard(t.id).catch(e => console.warn('lazy-startup: discard failed', t.id, e));
};
chrome.tabs.onUpdated.addListener((id, info, tab) => { if (info.status === 'loading') maybe(tab); });
chrome.tabs.onCreated.addListener(maybe);
