# Startup Tab Suspender

Keep restored background tabs **unloaded** on startup until you click them.

Chromium-based browsers (Brave, Chrome, Edge) reload the content of *every*
restored tab when you reopen a session. With many tabs this causes a startup
CPU/network spike and sluggish first seconds. This extension restores your full
tab strip but leaves background tabs suspended; clicking a tab loads it.

## How it works

MV3 service worker, no content scripts:

- On browser start (`runtime.onStartup` / `runtime.onInstalled`) it opens a
  120 s window.
- Within that window, an inactive `http(s)` tab that starts loading
  (`tabs.onUpdated` status `loading`, plus a best-effort `tabs.onCreated`) is
  immediately discarded via the native `chrome.tabs.discard` API.
- The active tab in each window is never discarded.

Discarded tabs keep their title, favicon and position and reload when selected.
Practical limitation: a restored background tab may still emit a single,
quickly-aborted document request before it is discarded.

`chrome.tabs.discard` is Chrome's native discard (same mechanism as Memory
Saver), so tabs are not replaced by a fake page — removing the extension never
loses a tab.

## Install (unpacked, for development)

1. Open `brave://extensions`.
2. Enable **Developer mode**.
3. **Load unpacked** → select the `src/` directory.
4. Restart the browser and reopen your session.

For a command-line / launcher activation you can instead pass
`--load-extension=/absolute/path/to/src` to the browser binary.

## Verify

- `brave://extensions` → "Startup Tab Suspender" is listed and enabled.
- `brave://discards` → restored background tabs show as **Discarded**; the
  active tab in each window is loaded.
- Tab strip: all tabs present with titles/favicons, no loading spinners.
- Click a suspended tab → only that tab loads.

**Pass:** all tabs restored, every background tab `Discarded`, only the active
tab loaded.
**Fail:** background tabs load/render or appear loaded in `brave://discards`.

## Rollback

- `brave://extensions` → remove "Startup Tab Suspender".
- If activated via a launcher flag, delete `--load-extension=...` from the
  launcher's `Exec` line and restart.

## Build / package

```sh
./scripts/package.sh          # -> dist/startup-tab-suspender-<version>.zip
```

The zip has `manifest.json` at its root and is ready for the Chrome Web Store
developer dashboard.

## Permissions

- `tabs` — read a tab's URL to only discard `http(s)` tabs (never internal
  `chrome://`, `brave://`, extension, `file://` or devtools pages).
- `storage` — remember the startup window across service-worker restarts.

A zero-permission variant was evaluated but rejected: without `tabs` the
extension cannot read tab URLs, so the `http(s)`-only guard is impossible and it
would also discard internal/extension tabs during the startup window.

## CI/CD (added later)

`.github/workflows/release.yml` runs on tags: it builds the zip and attaches it
to a GitHub Release. The Chrome Web Store publish step is stubbed and requires
these repository secrets (add them when you turn publishing on):

- `CWS_EXTENSION_ID`
- `CWS_CLIENT_ID`
- `CWS_CLIENT_SECRET`
- `CWS_REFRESH_TOKEN`

Until those exist, publish manually by uploading `dist/*.zip` (or `src/`) in the
developer dashboard.

## License

MIT — see [LICENSE](LICENSE).
