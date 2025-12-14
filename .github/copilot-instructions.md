<!-- .github/copilot-instructions.md - guidance for AI coding agents -->

# Copilot / AI Agent Instructions (concise)

Purpose: help an AI contributor quickly understand the architecture, coding patterns, and safe edit points for this repository so changes are correct and minimally invasive.

- **Big picture**: this repo implements a client-side "mobile phone" UI for SillyTavern. It's plain JavaScript + CSS (no build step). Primary responsibilities are: rendering the phone UI, loading per-app modules, listening to SillyTavern DOM/events, and parsing AI responses into app-specific data.

- **Key runtime entry points**:
  - `mobile-init.js` — orchestrates mobile module initialization and exposes `window.mobileDebug` helpers.
  - `optimized-loader.js` — advanced script/CSS loader used for parallel/lazy loading; instance: `window.optimizedLoader`.
  - `app/app-loader.js` — app-level loader mapping logical module names to script URLs; instance: `window.appLoader`.
  - `manifest.json` and top-level files (`index.js`, `mobile-phone.js`) — plugin metadata and core UI logic.

- **Global objects you can rely on (examples)**:
  - `window.appLoader`, `window.optimizedLoader`, `window.mobileDebug`
  - `window.realTimeSync` — real-time synchronizer (start/stop/status)
  - `window.weiboManager`, `window.weiboUI` — weibo app manager/UI hooks used by `app/weibo-app/weibo-control-app.js`

- **Module & naming conventions**:
  - App files live in `app/` and follow `*-app.js` / `*-app.css` naming (e.g. `message-app.js`, `shop-app.js`).
  - App-specific subfolders exist (e.g. `app/weibo-app/`) for larger features.
  - Loaders refer to logical module names (see `AppLoader.getModuleUrl`) — prefer editing that mapping when you add a new module.

- **Patterns to preserve when editing**:
  - No bundler assumptions — code expects immediate global side-effects (script tags adding globals). Avoid converting files to ES modules unless you update the loader.
  - Use existing global hooks rather than creating private runtime services. E.g., add features via `window.*` helpers or register with `appLoader`/`optimizedLoader` patterns.
  - UI and behavior split: CSS files named `*-app.css` alongside `*-app.js`. Keep styling changes scoped to those files.

- **Where to make feature changes safely (concrete examples)**:
  - To change app-loading order or add dependency: update `app/app-loader.js` or `mobile-init.js`.
  - To improve load reliability/perf: update `optimized-loader.js` (handles retries, concurrency, lazy/preload).
  - To change message send/receive flow: inspect `app/message-sender.js` and `app/message-renderer.js` (they are wired through `context-monitor` and `real-time-sync`).
  - To add a new app UI: add `app/<your-app>/your-app.js` and `your-app.css`, then register in `app-loader` or add a small entry in `AppLoader.loadModules`.

- **Debugging & run notes**:
  - There is no build step — to preview, serve the repo root as static files. Example (PowerShell):
    ```powershell
    npx http-server . -p 8080
    # or
    python -m http.server 8080
    ```
  - Enable runtime debug flags from the console: `window.DEBUG_MOBILE_PHONE = true`, `window.DEBUG_MESSAGE_APP = true`, etc. (`README.md` documents these flags).
  - Use `window.mobileDebug` to list/reload modules and inspect loader state.

- **Tests & performance tooling**:
  - There is no automated test harness detected. Performance helpers live in `performance-config.js` and `performance-test.js` — used by the runtime loader and `optimized-loader`.
  - For profiling, load pages in Chrome and use the profiler; the loaders expose timers via `window.mobilePerformanceMonitor`.

- **Examples / quick edits**:
  - Add a new app module named `foo`:
    1. Add `app/foo-app.js` and `styles/foo-app.css`.
    2. Add an entry for `foo` in `app-loader.js`'s modules array or update `getModuleUrl` mapping.
    3. Test by serving files and verifying `window.appLoader.getLoadStatus()`.

- **Safety checks (before PR)**:
  - Verify your change doesn't assume ES modules or bundler transforms.
  - Confirm global names added are prefixed (`weibo*`, `mobile*`, `app*`) to reduce conflicts.
  - If changing loader logic, ensure fallbacks maintain `async` loading and retry semantics.

If anything here is unclear or you'd like more detail (e.g., call graphs, more file examples), tell me which parts to expand and I will iterate.
