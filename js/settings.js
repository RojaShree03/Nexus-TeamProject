/* ================================================================
   NEXUS SETTINGS APP
   Runs inside a Nexus window (created by the core Window Manager).

   How it connects to the core (no core files need editing):
   - Registers the "settings" app with window.nexusAppManager
   - Mounts itself when the core emits  nexus:window:created
   - Cleans up when the core emits      nexus:window:closed
   - Settings are saved through State Manager  (nexusSettings)
   - Name / photo / password are saved through Auth Manager (nexusUser)

   Load order in index.html: after app-manager.js.
================================================================ */

(function () {
  "use strict";

  if (window.NexusSettings) return; // guard against double-loading

  const CoreState = window.nexusStateManager || null;
  const CoreAuth = window.nexusAuthManager || null;
  const CoreApp = window.nexusAppManager || null;

  if (!CoreState || !CoreAuth || !CoreApp) {
    console.error(
      "Nexus Settings: core managers not found. Load settings.js after app-manager.js."
    );
    return;
  }

  const APP_ID = "settings";

  /* ----------------------------------------------------------------
     Module state (reset every time the window is opened)
  ---------------------------------------------------------------- */
  let APP = null;        // root element of the mounted Settings window
  let state = null;      // page state for the current mount
  let mountId = 0;       // increases on mount/unmount so old timers can be ignored
  let clockTimer = null;
  let toastTimer = null;

  /* ----------------------------------------------------------------
     Labels + accent palette
  ---------------------------------------------------------------- */
  const LABELS = {
    home: "Home",
    system: "System",
    display: "Display",
    sound: "Sound",
    notifications: "Notifications",
    storage: "Storage",
    power: "Power & battery",
    bluetooth: "Bluetooth & devices",
    network: "Network & internet",
    personalization: "Personalization",
    apps: "Apps",
    accounts: "Accounts",
    timelanguage: "Time & language",
    privacy: "Privacy & security",
    about: "About",
  };

  const ACCENTS = {
    amber: { c1: "#ffb066", c2: "#ee7b3d" },
    coral: { c1: "#ff9a8b", c2: "#ef5b52" },
    violet: { c1: "#c9a6ff", c2: "#8b5cf6" },
    teal: { c1: "#7fe7c4", c2: "#18b590" },
    azure: { c1: "#8fc7ff", c2: "#3b82f6" },
  };

  /* ----------------------------------------------------------------
     Window markup (the core puts this inside .window-content)
  ---------------------------------------------------------------- */
  const SETTINGS_HTML = `
<section id="nexus-settings-app" class="ns-app" data-ns-theme="dark" data-ns-accent="amber" aria-label="Settings">

  <div class="ns-body">

    <aside class="ns-sidebar">
      <button type="button" class="ns-profile-card" data-ns-go="accounts">
        <span class="ns-avatar" id="ns-sidebar-avatar">N</span>
        <span class="ns-profile-meta">
          <span class="ns-profile-name" id="ns-sidebar-name">User</span><br>
          <span class="ns-profile-sub">View my Nexus profile</span>
        </span>
      </button>

      <div class="ns-search">
        <input type="search" id="ns-search-input" placeholder="Find a setting" autocomplete="off" aria-label="Find a setting">
      </div>

      <nav class="ns-nav" id="ns-nav" aria-label="Settings categories">
        <button type="button" class="ns-nav-item is-active" data-ns-go="home" data-ns-label="Home">
          <span class="ns-nav-icon" aria-hidden="true">⌂</span><span class="ns-nav-label">Home</span>
        </button>
        <button type="button" class="ns-nav-item" data-ns-go="system" data-ns-label="System">
          <span class="ns-nav-icon" aria-hidden="true">🖥</span><span class="ns-nav-label">System</span>
        </button>
        <button type="button" class="ns-nav-item" data-ns-go="bluetooth" data-ns-label="Bluetooth & devices">
          <span class="ns-nav-icon" aria-hidden="true">≋</span><span class="ns-nav-label">Bluetooth &amp; devices</span>
        </button>
        <button type="button" class="ns-nav-item" data-ns-go="network" data-ns-label="Network & internet">
          <span class="ns-nav-icon" aria-hidden="true">◈</span><span class="ns-nav-label">Network &amp; internet</span>
        </button>
        <button type="button" class="ns-nav-item" data-ns-go="personalization" data-ns-label="Personalization">
          <span class="ns-nav-icon" aria-hidden="true">◐</span><span class="ns-nav-label">Personalization</span>
        </button>
        <button type="button" class="ns-nav-item" data-ns-go="apps" data-ns-label="Apps">
          <span class="ns-nav-icon" aria-hidden="true">▦</span><span class="ns-nav-label">Apps</span>
        </button>
        <button type="button" class="ns-nav-item" data-ns-go="accounts" data-ns-label="Accounts">
          <span class="ns-nav-icon" aria-hidden="true">☺</span><span class="ns-nav-label">Accounts</span>
        </button>
        <button type="button" class="ns-nav-item" data-ns-go="timelanguage" data-ns-label="Time & language">
          <span class="ns-nav-icon" aria-hidden="true">◷</span><span class="ns-nav-label">Time &amp; language</span>
        </button>
        <button type="button" class="ns-nav-item" data-ns-go="privacy" data-ns-label="Privacy & security">
          <span class="ns-nav-icon" aria-hidden="true">⛨</span><span class="ns-nav-label">Privacy &amp; security</span>
        </button>
        <div class="ns-nav-divider" role="presentation"></div>
        <button type="button" class="ns-nav-item" data-ns-go="about" data-ns-label="About">
          <span class="ns-nav-icon" aria-hidden="true">ⓘ</span><span class="ns-nav-label">About</span>
        </button>
      </nav>
    </aside>

    <main class="ns-main">
      <div class="ns-crumbs" id="ns-crumbs" aria-label="Breadcrumb"></div>
      <div class="ns-content" id="ns-content"></div>
    </main>

  </div>

  <input type="file" id="ns-avatar-input" accept="image/*" hidden>

  <dialog class="ns-dialog" id="ns-password-dialog">
    <div class="ns-dialog-inner">
      <div class="ns-dialog-steps-indicator" id="ns-dialog-steps">
        <span data-step="1"></span><span data-step="2"></span><span data-step="3"></span>
      </div>

      <div class="ns-dialog-step is-active" data-ns-step="1">
        <h3>Confirm it's you</h3>
        <p class="ns-dialog-sub">Enter your current password to continue.</p>
        <div class="ns-field">
          <label for="ns-pw-current">Current password</label>
          <input type="password" id="ns-pw-current" autocomplete="current-password">
        </div>
        <p class="ns-error-text" id="ns-pw-error-1"></p>
        <div class="ns-btn-row">
          <button type="button" class="ns-btn" data-ns-action="close-dialog">Cancel</button>
          <button type="button" class="ns-btn ns-btn-primary" data-ns-action="pw-step1-next">Continue</button>
        </div>
      </div>

      <div class="ns-dialog-step" data-ns-step="2">
        <h3>Create a new password</h3>
        <p class="ns-dialog-sub">Make it something you haven't used on Nexus before.</p>
        <div class="ns-field">
          <label for="ns-pw-new">New password</label>
          <input type="password" id="ns-pw-new" autocomplete="new-password">
          <div class="ns-strength"><div class="ns-strength-fill" id="ns-pw-strength-fill"></div></div>
          <span class="ns-strength-label" id="ns-pw-strength-label">Too short</span>
        </div>
        <div class="ns-field">
          <label for="ns-pw-confirm">Confirm new password</label>
          <input type="password" id="ns-pw-confirm" autocomplete="new-password">
        </div>
        <p class="ns-error-text" id="ns-pw-error-2"></p>
        <div class="ns-btn-row">
          <button type="button" class="ns-btn" data-ns-action="pw-step2-back">Back</button>
          <button type="button" class="ns-btn ns-btn-primary" data-ns-action="pw-step2-next">Save password</button>
        </div>
      </div>

      <div class="ns-dialog-step" data-ns-step="3">
        <div class="ns-success-check">
          <svg viewBox="0 0 60 60" aria-hidden="true">
            <circle cx="30" cy="30" r="26" />
            <path id="ns-check-path" d="M18 31l8 8 16-18" />
          </svg>
        </div>
        <h3 style="text-align:center">Password updated</h3>
        <p class="ns-dialog-sub" style="text-align:center">You're all set — use it next time you sign in.</p>
        <div class="ns-btn-row">
          <button type="button" class="ns-btn ns-btn-primary" style="width:100%" data-ns-action="close-dialog">Done</button>
        </div>
      </div>
    </div>
  </dialog>

  <div class="ns-toast" id="ns-toast" role="status" aria-live="polite"></div>

</section>`;

  /* ----------------------------------------------------------------
     Small helpers (all DOM lookups are scoped to the mounted window)
  ---------------------------------------------------------------- */
  const $ = (sel, ctx) => {
    const root = ctx || APP;
    return root ? root.querySelector(sel) : null;
  };
  const $all = (sel, ctx) => {
    const root = ctx || APP;
    return root ? Array.from(root.querySelectorAll(sel)) : [];
  };

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // setTimeout that does nothing if the window was closed / reopened meanwhile
  function later(fn, ms) {
    const id = mountId;
    return setTimeout(() => {
      if (APP && id === mountId) fn();
    }, ms);
  }

  function emitEvent(name, detail) {
    document.dispatchEvent(new CustomEvent("nexus:" + name, { detail }));
  }

  /* ----------------------------------------------------------------
     Core adapters: settings (State Manager) + identity (Auth Manager)
  ---------------------------------------------------------------- */

  // Core's defaults contain null values (e.g. wallpaper), so treat null as "not set".
  function readSetting(key, fallback) {
    const all = CoreState.getSettings() || {};
    const value = all[key];
    return value === undefined || value === null ? fallback : value;
  }

  // updateSetting() only changes memory, so we also call saveSettings().
  function writeSetting(key, value) {
    CoreState.updateSetting(key, value);
    CoreState.saveSettings();
    emitEvent("settings:changed", { key, value });
  }

  function persist(key, value) {
    writeSetting(key.replace(/^ns-/, ""), value);
  }

  function getCurrentUser() {
    const u = CoreAuth.getUser() || {};
    const name = u.name || "User";
    const fallbackUsername = name.toLowerCase().replace(/\s+/g, "") + "@nexus";
    return {
      name,
      username: readSetting("profile-username", fallbackUsername),
      avatar: u.avatar || "",
    };
  }

  // Name + photo live in the Auth Manager's user record; username lives in settings.
  // Returns false if the user record could not be saved.
  function updateCurrentUser(patch) {
    let ok = true;

    const identity = {};
    if ("name" in patch) identity.name = patch.name;
    if ("avatar" in patch) identity.avatar = patch.avatar;

    if (Object.keys(identity).length) {
      const user = CoreAuth.getUser();
      ok = user ? CoreAuth.saveUser({ ...user, ...identity }) : false;
    }

    if ("username" in patch) writeSetting("profile-username", patch.username);

    emitEvent("profile:changed", patch);

    // refresh the desktop top bar + greeting
    if (window.Nexus) {
      window.Nexus.updateDesktopAvatar?.();
      window.Nexus.updateDesktopGreeting?.();
    }
    return ok;
  }

  function createState() {
    const theme = readSetting("theme", "dark");
    return {
      path: [],
      pendingHighlight: null,
      theme: ["light", "dark", "system"].includes(theme) ? theme : "dark",
      accent: readSetting("accent", "amber"),
      wallpaper: String(readSetting("wallpaper", "1")),
      profile: getCurrentUser(),
      toggles: Object.assign(
        {
          "bluetooth-master": true,
          "wifi-master": true,
          "airplane-mode": false,
          "night-light": false,
          "notif-master": true,
          "notif-terminal": true,
          "notif-notes": true,
          "notif-filemanager": false,
          "priv-location": true,
          "priv-camera": true,
          "priv-mic": false,
          "priv-activity": true,
          "battery-saver": false,
          "screensaver": true,
          "clock-24h": false,
        },
        readSetting("toggles", {})
      ),
      sliders: Object.assign({ brightness: 80, volume: 62 }, readSetting("sliders", {})),
      storage: Object.assign(
        { apps: 18, docs: 12, media: 26, system: 12 },
        readSetting("storage", {})
      ),
      btDevices: [
        { id: "buds", name: "Nexus Buds Pro", type: "Audio", connected: true },
        { id: "kbd", name: "Nexus Keyboard", type: "Input", connected: true },
      ],
      scanning: false,
    };
  }

  /* ----------------------------------------------------------------
     Theme + accent (silent = true means "don't save / don't emit")
  ---------------------------------------------------------------- */
  function applyTheme(theme, silent) {
    let resolved = theme;
    if (theme === "system") {
      resolved = window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    APP.dataset.nsTheme = resolved;
    state.theme = theme;
    if (!silent) persist("ns-theme", theme);
  }

  function applyAccent(id, silent) {
    const palette = ACCENTS[id] || ACCENTS.amber;
    APP.style.setProperty("--ns-accent-1", palette.c1);
    APP.style.setProperty("--ns-accent-2", palette.c2);
    APP.style.setProperty("--ns-accent-solid", palette.c2);
    APP.dataset.nsAccent = id;
    state.accent = id;
    if (!silent) persist("ns-accent", id);
  }

  function setThemeWithTransition(theme) {
    if (document.startViewTransition) {
      document.startViewTransition(() => applyTheme(theme));
    } else {
      applyTheme(theme);
    }
  }

  /* ----------------------------------------------------------------
     Navigation: path array + breadcrumbs
  ---------------------------------------------------------------- */
  function navigate(path, opts) {
    if (!APP) return;
    state.path = path;
    state.pendingHighlight = (opts && opts.highlight) || null;
    renderCrumbs();
    renderContent();
    syncSidebar();
  }

  function renderCrumbs() {
    const crumbs = $("#ns-crumbs");
    if (!crumbs) return;
    const parts = ["Settings", ...state.path.map((p) => LABELS[p] || p)];
    crumbs.innerHTML = parts
      .map((label, i) => {
        const isLast = i === parts.length - 1;
        return (
          `<button type="button" class="ns-crumb${isLast ? " is-current" : ""}" data-ns-crumb="${i}"${isLast ? ' aria-current="page"' : ""}>${escapeHTML(label)}</button>` +
          (isLast ? "" : `<span class="ns-crumb-sep" aria-hidden="true">›</span>`)
        );
      })
      .join("");
  }

  function syncSidebar() {
    const top = state.path[0] || "home";
    $all(".ns-nav-item").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.nsGo === top);
    });
  }

  /* ----------------------------------------------------------------
     Reusable markup fragments
  ---------------------------------------------------------------- */
  function switchHTML(key, checked, disabled) {
    return `<button type="button" class="ns-switch${checked ? " is-on" : ""}" data-ns-toggle="${key}" role="switch" aria-checked="${checked}"${disabled ? " disabled" : ""}></button>`;
  }

  function tileHTML(go, icon, label) {
    return `<button type="button" class="ns-tile" data-ns-go="${go}"><span class="ns-tile-icon" aria-hidden="true">${icon}</span><span>${escapeHTML(label)}</span></button>`;
  }

  function listLinkHTML(go, icon, title, desc) {
    return `
      <button type="button" class="ns-list-link" data-ns-go="${go}">
        <span class="ns-list-link-icon" aria-hidden="true">${icon}</span>
        <span class="ns-list-link-text"><strong>${escapeHTML(title)}</strong><small>${escapeHTML(desc)}</small></span>
        <span class="ns-list-link-chevron" aria-hidden="true">›</span>
      </button>`;
  }

  /* ----------------------------------------------------------------
     Page renderers — each returns an HTML string for #ns-content
  ---------------------------------------------------------------- */
  function pageHome() {
    return `
      <div class="ns-page-head">
        <h1>Settings</h1>
        <p class="ns-page-sub">Recommended, then everything else, one tap away.</p>
      </div>

      <section class="ns-section">
        <h2 class="ns-section-title">Recommended settings</h2>
        <div class="ns-recommend-row">
          <button type="button" class="ns-recommend-card" data-ns-go="system/display">
            <span class="ns-recommend-icon" aria-hidden="true">☀</span>
            <span class="ns-recommend-text"><strong>Display</strong><small>Brightness, night light, scale</small></span>
          </button>
          <button type="button" class="ns-recommend-card" data-ns-go="system/sound">
            <span class="ns-recommend-icon" aria-hidden="true">🔊</span>
            <span class="ns-recommend-text"><strong>Sound</strong><small>Volume, output device</small></span>
          </button>
          <button type="button" class="ns-recommend-card" data-ns-go="personalization" data-ns-highlight="theme">
            <span class="ns-recommend-icon" aria-hidden="true">◐</span>
            <span class="ns-recommend-text"><strong>Contrast themes</strong><small>Light, dark or system</small></span>
          </button>
        </div>
      </section>

      <section class="ns-section">
        <h2 class="ns-section-title">Commonly used settings</h2>
        <div class="ns-tile-grid">
          ${tileHTML("bluetooth", "≋", "Bluetooth & devices")}
          ${tileHTML("personalization", "◐", "Personalization")}
          ${tileHTML("apps", "▦", "Apps")}
          ${tileHTML("accounts", "☺", "Accounts")}
          ${tileHTML("timelanguage", "◷", "Time & language")}
          ${tileHTML("privacy", "⛨", "Privacy & security")}
          ${tileHTML("network", "◈", "Network & internet")}
          ${tileHTML("system", "🖥", "System")}
          ${tileHTML("about", "ⓘ", "About")}
        </div>
      </section>`;
  }

  function pageSystemRoot() {
    return `
      <div class="ns-page-head"><h1>System</h1><p class="ns-page-sub">Display, sound, storage and power.</p></div>
      <section class="ns-section">
        ${listLinkHTML("system/display", "☀", "Display", "Brightness, night light, scale")}
        ${listLinkHTML("system/sound", "🔊", "Sound", "Volume, output device")}
        ${listLinkHTML("system/notifications", "🔔", "Notifications", "Alerts from apps and Nexus")}
        ${listLinkHTML("system/storage", "▤", "Storage", "See how space is being used")}
        ${listLinkHTML("system/power", "⚡", "Power & battery", "Battery saver, sleep timer")}
      </section>`;
  }

  function pageDisplay() {
    const b = state.sliders.brightness;
    const nightOn = state.toggles["night-light"];
    return `
      <div class="ns-page-head"><h1>Display</h1><p class="ns-page-sub">Settings › System › Display</p></div>

      <div class="ns-preview" id="ns-display-preview">
        <div class="ns-preview-dim" id="ns-preview-dim" style="opacity:${(100 - b) / 130}"></div>
        <div class="ns-preview-warm${nightOn ? " is-on" : ""}" id="ns-preview-warm"></div>
        <span>Preview</span>
      </div>

      <div class="ns-card">
        <div class="ns-card-row">
          <div class="ns-row-text"><strong>Brightness</strong><small>Adjust how bright the screen appears</small></div>
        </div>
        <div class="ns-slider-row">
          <input type="range" min="10" max="100" value="${b}" data-ns-slider="brightness" aria-label="Brightness">
          <output class="ns-slider-output" id="ns-brightness-output">${b}%</output>
        </div>
      </div>

      <div class="ns-card">
        <div class="ns-card-row">
          <div class="ns-row-text"><strong>Night light</strong><small>Warmer colors to help you wind down</small></div>
          ${switchHTML("night-light", nightOn)}
        </div>
        <div class="ns-card-row">
          <div class="ns-row-text"><strong>Orientation</strong><small>Landscape or portrait</small></div>
          <select class="ns-select" data-ns-select="orientation">
            <option>Landscape</option>
            <option>Portrait</option>
          </select>
        </div>
        <div class="ns-card-row">
          <div class="ns-row-text"><strong>Scale</strong><small>Make text and apps bigger</small></div>
          <select class="ns-select" data-ns-select="scale">
            <option>100%</option>
            <option>125%</option>
            <option>150%</option>
          </select>
        </div>
      </div>`;
  }

  function pageSound() {
    const v = state.sliders.volume;
    const muted = v === 0;
    return `
      <div class="ns-page-head"><h1>Sound</h1><p class="ns-page-sub">Settings › System › Sound</p></div>

      <div class="ns-card">
        <div class="ns-card-row">
          <div class="ns-row-text"><strong>Master volume</strong><small>${muted ? "Muted" : v + "% output level"}</small></div>
          <div class="ns-wave${muted ? " is-paused" : ""}" id="ns-wave"><span></span><span></span><span></span><span></span><span></span></div>
        </div>
        <div class="ns-slider-row">
          <input type="range" min="0" max="100" value="${v}" data-ns-slider="volume" aria-label="Volume">
          <output class="ns-slider-output" id="ns-volume-output">${v}%</output>
        </div>
      </div>

      <div class="ns-card">
        <div class="ns-card-row">
          <div class="ns-row-text"><strong>Output device</strong><small>Where sound plays from</small></div>
          <select class="ns-select" data-ns-select="output">
            <option>Nexus Buds Pro</option>
            <option>System speakers</option>
          </select>
        </div>
      </div>`;
  }

  function pageStorage() {
    const s = state.storage;
    const used = s.apps + s.docs + s.media + s.system;
    return `
      <div class="ns-page-head"><h1>Storage</h1><p class="ns-page-sub">Settings › System › Storage</p></div>

      <div class="ns-card ns-storage-wrap" id="ns-storage-card" style="--ns-p1:${s.apps}%;--ns-p2:${s.apps + s.docs}%;--ns-p3:${s.apps + s.docs + s.media}%;--ns-p4:${used}%;">
        <div class="ns-donut" id="ns-storage-donut">
          <div class="ns-donut-hole"><strong id="ns-storage-used">${used}%</strong><small>used</small></div>
        </div>
        <div class="ns-legend">
          <div class="ns-legend-row"><span class="ns-legend-dot" style="background:#f2954f"></span> Apps <span>${s.apps}%</span></div>
          <div class="ns-legend-row"><span class="ns-legend-dot" style="background:#ffd08a"></span> Documents <span>${s.docs}%</span></div>
          <div class="ns-legend-row"><span class="ns-legend-dot" style="background:#7fe7c4"></span> Media <span>${s.media}%</span></div>
          <div class="ns-legend-row"><span class="ns-legend-dot" style="background:#8fc7ff"></span> System <span>${s.system}%</span></div>
          <div class="ns-legend-row"><span class="ns-legend-dot" style="background:var(--ns-panel-strong)"></span> Free <span>${100 - used}%</span></div>
        </div>
      </div>

      <div class="ns-card">
        <div class="ns-card-row">
          <div class="ns-row-text"><strong>Free up space</strong><small>Clear cached files apps no longer need</small></div>
          <button type="button" class="ns-btn ns-btn-primary" data-ns-action="free-up-space">Clean up</button>
        </div>
      </div>`;
  }

  function pageNotifications() {
    const master = state.toggles["notif-master"];
    const row = (key, label) =>
      `<div class="ns-card-row"><div class="ns-row-text"><strong>${escapeHTML(label)}</strong></div>${switchHTML(key, state.toggles[key], !master)}</div>`;
    return `
      <div class="ns-page-head"><h1>Notifications</h1><p class="ns-page-sub">Settings › System › Notifications</p></div>
      <div class="ns-card">
        <div class="ns-card-row">
          <div class="ns-row-text"><strong>Notifications</strong><small>Turn all app notifications on or off</small></div>
          ${switchHTML("notif-master", master)}
        </div>
      </div>
      <div class="ns-card" id="ns-notif-apps">
        ${row("notif-terminal", "Terminal")}
        ${row("notif-notes", "Notes")}
        ${row("notif-filemanager", "File Manager")}
      </div>`;
  }

  function pagePower() {
    return `
      <div class="ns-page-head"><h1>Power & battery</h1><p class="ns-page-sub">Settings › System › Power & battery</p></div>
      <div class="ns-card">
        <div class="ns-card-row">
          <div class="ns-row-text"><strong>Battery saver</strong><small>Extend battery life by reducing background activity</small></div>
          ${switchHTML("battery-saver", state.toggles["battery-saver"])}
        </div>
        <div class="ns-card-row">
          <div class="ns-row-text"><strong>Screensaver</strong><small>Show a screensaver when idle</small></div>
          ${switchHTML("screensaver", state.toggles["screensaver"])}
        </div>
        <div class="ns-card-row">
          <div class="ns-row-text"><strong>Sleep after</strong><small>Turn off the screen automatically</small></div>
          <select class="ns-select" data-ns-select="sleep-timer">
            <option>Never</option><option>1 minute</option><option selected>5 minutes</option><option>15 minutes</option><option>30 minutes</option>
          </select>
        </div>
      </div>`;
  }

  function bluetoothDeviceListHTML() {
    if (!state.toggles["bluetooth-master"]) return "";
    if (state.scanning) {
      return `<div class="ns-device-list"><div class="ns-scan-row"><span class="ns-spinner" aria-hidden="true"></span> Scanning for devices…</div></div>`;
    }
    return `<div class="ns-device-list" id="ns-bt-devices">${state.btDevices
      .map(
        (d) => `
        <div class="ns-device">
          <span class="ns-device-icon" aria-hidden="true">${d.type === "Audio" ? "🎧" : "⌨"}</span>
          <span class="ns-device-name">${escapeHTML(d.name)}</span>
          <span class="ns-device-status">${d.connected ? "Connected" : "Not connected"}</span>
          ${switchHTML("bt-device-" + d.id, d.connected)}
        </div>`
      )
      .join("")}</div>`;
  }

  function pageBluetooth() {
    const on = state.toggles["bluetooth-master"];
    return `
      <div class="ns-page-head"><h1>Bluetooth & devices</h1><p class="ns-page-sub">Connect headphones, keyboards and more.</p></div>
      <div class="ns-card">
        <div class="ns-card-row">
          <div class="ns-row-text"><strong>Bluetooth</strong><small>${on ? "Discoverable as NEXUS-PC" : "Turned off"}</small></div>
          ${switchHTML("bluetooth-master", on)}
        </div>
        <div id="ns-bt-body">
          ${bluetoothDeviceListHTML()}
          ${on ? `<div class="ns-btn-row"><button type="button" class="ns-btn" data-ns-action="scan-device"${state.scanning ? " disabled" : ""}>Add device</button></div>` : ""}
        </div>
      </div>`;
  }

  function pageNetwork() {
    const wifi = state.toggles["wifi-master"];
    const airplane = state.toggles["airplane-mode"];
    return `
      <div class="ns-page-head"><h1>Network & internet</h1><p class="ns-page-sub">Wi-Fi and connectivity.</p></div>
      <div class="ns-card">
        <div class="ns-card-row">
          <div class="ns-row-text"><strong>Airplane mode</strong><small>Turns off Wi-Fi and Bluetooth</small></div>
          ${switchHTML("airplane-mode", airplane)}
        </div>
        <div class="ns-card-row">
          <div class="ns-row-text"><strong>Wi-Fi</strong><small>${wifi && !airplane ? "Connected" : "Off"}</small></div>
          ${switchHTML("wifi-master", wifi, airplane)}
        </div>
      </div>
      ${
        wifi && !airplane
          ? `<div class="ns-card">
              <div class="ns-card-row">
                <div class="ns-row-text"><strong>Nexus Home 5G</strong><small>Connected, secured</small></div>
                <span class="ns-signal-bars is-active" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
              </div>
            </div>`
          : ""
      }`;
  }

  function pagePersonalization() {
    const theme = state.theme;
    const radio = (val, label) => `
      <label class="ns-radio-card${theme === val ? " is-selected" : ""}">
        <input type="radio" name="ns-theme-radio" value="${val}" data-ns-radio="theme" ${theme === val ? "checked" : ""}>
        ${escapeHTML(label)}
      </label>`;
    const swatch = (id) => `<button type="button" class="ns-swatch${state.accent === id ? " is-selected" : ""}" data-ns-action="pick-accent" data-accent="${id}" style="background:linear-gradient(135deg, ${ACCENTS[id].c1}, ${ACCENTS[id].c2})" aria-label="${id} accent"></button>`;
    const wallpaper = (id) => `<button type="button" class="ns-wallpaper${state.wallpaper === id ? " is-selected" : ""}" data-ns-action="pick-wallpaper" data-w="${id}" aria-label="Wallpaper ${id}"></button>`;

    return `
      <div class="ns-page-head"><h1>Personalization</h1><p class="ns-page-sub">Make Nexus look like yours.</p></div>

      <section class="ns-section" id="ns-theme-section">
        <h2 class="ns-section-title">Theme</h2>
        <div class="ns-radio-row">${radio("light", "Light")}${radio("dark", "Dark")}${radio("system", "System")}</div>
      </section>

      <section class="ns-section">
        <h2 class="ns-section-title">Accent color</h2>
        <div class="ns-swatch-row">${Object.keys(ACCENTS).map(swatch).join("")}</div>
      </section>

      <section class="ns-section">
        <h2 class="ns-section-title">Wallpaper</h2>
        <div class="ns-wallpaper-row">${wallpaper("1")}${wallpaper("2")}${wallpaper("3")}</div>
      </section>`;
  }

  function pageApps() {
    const apps = [
      { name: "File Manager", size: "24 MB", required: false },
      { name: "Terminal", size: "18 MB", required: false },
      { name: "Notepad", size: "9 MB", required: false },
      { name: "Calculator", size: "6 MB", required: false },
      { name: "Browser", size: "112 MB", required: false },
      { name: "Settings", size: "31 MB", required: true },
    ];
    return `
      <div class="ns-page-head"><h1>Apps</h1><p class="ns-page-sub">Installed apps and their storage use.</p></div>
      <div class="ns-search" style="margin-bottom:12px;">
        <input type="search" id="ns-apps-search" placeholder="Search apps" aria-label="Search apps">
      </div>
      <div class="ns-card" id="ns-apps-list">
        ${apps
          .map(
            (a) => `
          <div class="ns-card-row" data-ns-app-row data-name="${a.name.toLowerCase()}">
            <div class="ns-row-text"><strong>${a.name}</strong><small>${a.size}</small></div>
            <button type="button" class="ns-btn ns-btn-danger" ${a.required ? "disabled" : ""} data-ns-action="uninstall" data-app="${a.name}">${a.required ? "Required" : "Uninstall"}</button>
          </div>`
          )
          .join("")}
      </div>`;
  }

  function pageAccounts() {
    const p = state.profile;
    const avatarInner = p.avatar
      ? `<img src="${escapeHTML(p.avatar)}" alt="">`
      : (p.name[0] || "N").toUpperCase();
    return `
      <div class="ns-page-head"><h1>Accounts</h1><p class="ns-page-sub">Your Nexus profile and sign-in.</p></div>

      <div class="ns-card">
        <div class="ns-card-row">
          <div style="display:flex;align-items:center;gap:14px;">
            <span class="ns-avatar" id="ns-page-avatar" style="width:56px;height:56px;font-size:20px;">${avatarInner}</span>
            <button type="button" class="ns-btn" data-ns-action="avatar-trigger">Change photo</button>
          </div>
        </div>
        <div class="ns-field">
          <label for="ns-name-input">Display name</label>
          <input type="text" id="ns-name-input" value="${escapeHTML(p.name)}">
        </div>
        <div class="ns-field">
          <label for="ns-username-input">Username</label>
          <input type="text" id="ns-username-input" value="${escapeHTML(p.username)}">
        </div>
        <div class="ns-btn-row">
          <button type="button" class="ns-btn ns-btn-primary" data-ns-action="save-profile">Save changes</button>
        </div>
      </div>

      <div class="ns-card">
        <div class="ns-card-row">
          <div class="ns-row-text"><strong>Password</strong><small>Used to sign in to Nexus</small></div>
          <button type="button" class="ns-btn" data-ns-action="open-password">Change password</button>
        </div>
      </div>`;
  }

  function pageTimeLanguage() {
    return `
      <div class="ns-page-head"><h1>Time & language</h1><p class="ns-page-sub">Clock format, timezone and language.</p></div>
      <div class="ns-card">
        <div class="ns-clock" id="ns-clock">--:--</div>
        <div class="ns-clock-date" id="ns-clock-date"></div>
      </div>
      <div class="ns-card">
        <div class="ns-card-row">
          <div class="ns-row-text"><strong>24-hour time</strong><small>Show the clock in 24-hour format</small></div>
          ${switchHTML("clock-24h", state.toggles["clock-24h"])}
        </div>
        <div class="ns-card-row">
          <div class="ns-row-text"><strong>Timezone</strong></div>
          <select class="ns-select" data-ns-select="timezone">
            <option>Asia/Kolkata (GMT+5:30)</option>
            <option>UTC</option>
            <option>America/New_York</option>
          </select>
        </div>
        <div class="ns-card-row">
          <div class="ns-row-text"><strong>Language</strong></div>
          <select class="ns-select" data-ns-select="language">
            <option>English</option>
            <option>Tamil</option>
            <option>Hindi</option>
            <option>Spanish</option>
          </select>
        </div>
      </div>`;
  }

  function pagePrivacy() {
    const row = (key, label, desc) => `
      <div class="ns-card-row">
        <div class="ns-row-text"><strong>${escapeHTML(label)}</strong><small>${escapeHTML(desc)}</small></div>
        ${switchHTML(key, state.toggles[key])}
      </div>`;
    return `
      <div class="ns-page-head"><h1>Privacy & security</h1><p class="ns-page-sub">Control what apps can access.</p></div>
      <div class="ns-card">
        ${row("priv-location", "Location", "Allow apps to use your location")}
        ${row("priv-camera", "Camera", "Allow apps to use the camera")}
        ${row("priv-mic", "Microphone", "Allow apps to use the microphone")}
        ${row("priv-activity", "Activity history", "Let Nexus remember what you open")}
      </div>
      <div class="ns-card">
        <div class="ns-card-row">
          <div class="ns-row-text"><strong>Clear activity history</strong><small>Remove your recent activity from this device</small></div>
          <button type="button" class="ns-btn ns-btn-danger" data-ns-action="clear-history">Clear</button>
        </div>
      </div>`;
  }

  function pageAbout() {
    return `
      <div class="ns-page-head"><h1>About</h1><p class="ns-page-sub">Settings › About</p></div>
      <div class="ns-card">
        <div class="ns-card-row"><div class="ns-row-text"><strong>Device name</strong></div><div>NEXUS-PC</div></div>
        <div class="ns-card-row"><div class="ns-row-text"><strong>Nexus OS version</strong></div><div>1.0</div></div>
        <div class="ns-card-row"><div class="ns-row-text"><strong>Update</strong></div><div id="ns-update-status">Nexus 1.1 available</div></div>
        <div class="ns-btn-row">
          <button type="button" class="ns-btn ns-btn-primary" id="ns-update-btn" data-ns-action="check-update">Check for updates</button>
        </div>
      </div>
      <div class="ns-card">
        <div class="ns-card-row"><div class="ns-row-text"><strong>CPU</strong></div><div>24%</div></div>
        <div class="ns-card-row"><div class="ns-row-text"><strong>Memory</strong></div><div>42%</div></div>
        <div class="ns-card-row"><div class="ns-row-text"><strong>Storage</strong></div><div>68%</div></div>
      </div>`;
  }

  /* ----------------------------------------------------------------
     Content dispatcher
  ---------------------------------------------------------------- */
  function renderContent() {
    const content = $("#ns-content");
    if (!content) return;

    const key = state.path.join("/");
    const routes = {
      "": pageHome,
      "system": pageSystemRoot,
      "system/display": pageDisplay,
      "system/sound": pageSound,
      "system/storage": pageStorage,
      "system/notifications": pageNotifications,
      "system/power": pagePower,
      "bluetooth": pageBluetooth,
      "network": pageNetwork,
      "personalization": pagePersonalization,
      "apps": pageApps,
      "accounts": pageAccounts,
      "timelanguage": pageTimeLanguage,
      "privacy": pagePrivacy,
      "about": pageAbout,
    };
    const render = routes[key] || pageHome;

    // restart the fade-up animation on every navigation
    content.classList.remove("ns-content");
    void content.offsetWidth; // force reflow
    content.classList.add("ns-content");
    content.innerHTML = render();

    stopClock();
    if (key === "timelanguage") startClock();

    if (state.pendingHighlight) {
      const target =
        key === "personalization" && state.pendingHighlight === "theme"
          ? $("#ns-theme-section")
          : null;
      if (target) {
        target.classList.add("ns-flash");
        target.scrollIntoView({ block: "nearest" });
      }
      state.pendingHighlight = null;
    }
  }

  /* ----------------------------------------------------------------
     Clock (Time & language page)
  ---------------------------------------------------------------- */
  function tickClock() {
    const timeEl = $("#ns-clock");
    const dateEl = $("#ns-clock-date");
    if (!timeEl || !dateEl || !state) return;
    const now = new Date();
    timeEl.textContent = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: !state.toggles["clock-24h"],
    }).format(now);
    dateEl.textContent = new Intl.DateTimeFormat("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    }).format(now);
  }
  function startClock() {
    stopClock();
    tickClock();
    clockTimer = setInterval(tickClock, 1000);
  }
  function stopClock() {
    if (clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  }

  /* ----------------------------------------------------------------
     Toast
  ---------------------------------------------------------------- */
  function showToast(message) {
    const toast = $("#ns-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  /* ----------------------------------------------------------------
     Toggle / slider / select / radio handling
  ---------------------------------------------------------------- */
  function handleToggle(el) {
    const key = el.dataset.nsToggle;

    // Bluetooth per-device switches are not saved in state.toggles
    if (key.startsWith("bt-device-")) {
      const id = key.replace("bt-device-", "");
      const device = state.btDevices.find((d) => d.id === id);
      if (device) device.connected = !device.connected;
      el.classList.toggle("is-on");
      el.setAttribute("aria-checked", el.classList.contains("is-on"));
      const statusEl = el.closest(".ns-device")?.querySelector(".ns-device-status");
      if (statusEl) statusEl.textContent = device && device.connected ? "Connected" : "Not connected";
      return;
    }

    state.toggles[key] = !state.toggles[key];
    persist("ns-toggles", state.toggles);

    // cross-feature logic
    if (key === "airplane-mode" && state.toggles[key]) {
      state.toggles["wifi-master"] = false;
      persist("ns-toggles", state.toggles);
      renderContent();
      return;
    }
    if (key === "bluetooth-master" || key === "wifi-master" || key === "notif-master") {
      renderContent(); // these affect sibling rows, safest to re-render the page
      return;
    }

    el.classList.toggle("is-on");
    el.setAttribute("aria-checked", el.classList.contains("is-on"));

    if (key === "night-light") {
      const overlay = $("#ns-preview-warm");
      if (overlay) overlay.classList.toggle("is-on", state.toggles[key]);
    }
    if (key === "clock-24h") tickClock();
  }

  function handleSlider(el) {
    const key = el.dataset.nsSlider;
    const value = Number(el.value);
    state.sliders[key] = value;
    persist("ns-sliders", state.sliders);

    if (key === "brightness") {
      const out = $("#ns-brightness-output");
      if (out) out.textContent = value + "%";
      const dim = $("#ns-preview-dim");
      if (dim) dim.style.opacity = (100 - value) / 130;
    }
    if (key === "volume") {
      const out = $("#ns-volume-output");
      if (out) out.textContent = value + "%";
      const wave = $("#ns-wave");
      if (wave) wave.classList.toggle("is-paused", value === 0);
    }
  }

  function handleSelect() {
    // Cosmetic in this demo — wiring to real OS behaviour happens where each app owns that state.
  }

  function handleRadio(el) {
    if (el.dataset.nsRadio === "theme") {
      setThemeWithTransition(el.value);
      $all(".ns-radio-card").forEach((card) => card.classList.remove("is-selected"));
      el.closest(".ns-radio-card").classList.add("is-selected");
    }
  }

  function handleAction(action, el) {
    switch (action) {
      case "pick-accent":
        applyAccent(el.dataset.accent);
        renderContent();
        break;

      case "pick-wallpaper":
        state.wallpaper = el.dataset.w;
        persist("ns-wallpaper", state.wallpaper); // emits nexus:settings:changed
        renderContent();
        showToast("Wallpaper updated");
        break;

      case "scan-device": {
        state.scanning = true;
        renderContent();
        later(() => {
          state.scanning = false;
          const pool = [
            { name: "Nexus Mouse", type: "Input" },
            { name: "Nexus Speaker", type: "Audio" },
            { name: "Nexus Webcam", type: "Input" },
          ];
          const already = new Set(state.btDevices.map((d) => d.name));
          const next = pool.find((p) => !already.has(p.name));
          if (next) {
            state.btDevices.push({
              id: next.name.toLowerCase().replace(/\s+/g, "-"),
              name: next.name,
              type: next.type,
              connected: false,
            });
            showToast("Found " + next.name + " nearby");
          } else {
            showToast("No new devices found nearby");
          }
          renderContent();
        }, 1600);
        break;
      }

      case "free-up-space": {
        el.disabled = true;
        el.textContent = "Cleaning…";
        later(() => {
          state.storage.media = Math.max(4, state.storage.media - 8);
          persist("ns-storage", state.storage);
          renderContent();
          showToast("Freed up 3.1 GB");
        }, 1200);
        break;
      }

      case "check-update": {
        el.disabled = true;
        el.textContent = "Checking…";
        later(() => {
          const status = $("#ns-update-status");
          if (status) status.textContent = "Installing Nexus 1.1…";
          later(() => {
            if (status) status.textContent = "Restart to finish installing";
            el.textContent = "Restart now";
            el.disabled = false;
          }, 1200);
        }, 1000);
        break;
      }

      case "clear-history":
        el.textContent = "Cleared ✓";
        el.disabled = true;
        later(() => {
          el.textContent = "Clear";
          el.disabled = false;
        }, 1800);
        break;

      case "uninstall":
        showToast(el.dataset.app + " uninstalled");
        el.closest("[data-ns-app-row]")?.remove();
        break;

      case "avatar-trigger":
        $("#ns-avatar-input")?.click();
        break;

      case "save-profile": {
        const name = $("#ns-name-input").value.trim() || state.profile.name;
        const username = $("#ns-username-input").value.trim() || state.profile.username;
        state.profile.name = name;
        state.profile.username = username;
        const saved = updateCurrentUser({ name, username });
        syncProfileUI();
        showToast(saved ? "Profile updated" : "Couldn't save your profile");
        break;
      }

      case "open-password":
        openPasswordDialog();
        break;
      case "close-dialog":
        closePasswordDialog();
        break;
      case "pw-step1-next":
        passwordStep1Next();
        break;
      case "pw-step2-back":
        showPasswordStep(1);
        break;
      case "pw-step2-next":
        passwordStep2Next();
        break;
    }
  }

  function syncProfileUI() {
    const nameEl = $("#ns-sidebar-name");
    if (nameEl) nameEl.textContent = state.profile.name;
    const initial = (state.profile.name[0] || "N").toUpperCase();
    [$("#ns-sidebar-avatar"), $("#ns-page-avatar")].forEach((node) => {
      if (!node) return;
      node.innerHTML = state.profile.avatar
        ? `<img src="${escapeHTML(state.profile.avatar)}" alt="">`
        : initial;
    });
  }

  /* ----------------------------------------------------------------
     Profile photo (shrunk to 256px so it fits comfortably in localStorage)
  ---------------------------------------------------------------- */
  function shrinkImage(dataUrl, size, done) {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, size / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      done(canvas.toDataURL("image/png"));
    };
    img.onerror = () => done(dataUrl);
    img.src = dataUrl;
  }

  function bindAvatarInput() {
    const input = $("#ns-avatar-input");
    if (!input) return;
    input.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      e.target.value = ""; // allow choosing the same file again later
      if (!file || !file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = () => {
        shrinkImage(reader.result, 256, (avatar) => {
          if (!APP) return;
          const saved = updateCurrentUser({ avatar });
          if (saved) state.profile.avatar = avatar;
          syncProfileUI();
          showToast(saved ? "Profile photo updated" : "Couldn't save the photo");
        });
      };
      reader.readAsDataURL(file);
    });
  }

  /* ----------------------------------------------------------------
     Change-password dialog (checks and saves through the Auth Manager)
  ---------------------------------------------------------------- */
  function openPasswordDialog() {
    const dialog = $("#ns-password-dialog");
    if (!dialog) return;
    $("#ns-pw-current").value = "";
    $("#ns-pw-new").value = "";
    $("#ns-pw-confirm").value = "";
    $("#ns-pw-error-1").textContent = "";
    $("#ns-pw-error-2").textContent = "";
    updateStrength("");
    showPasswordStep(1);
    dialog.showModal();
  }
  function closePasswordDialog() {
    const dialog = $("#ns-password-dialog");
    if (dialog && dialog.open) dialog.close();
  }
  function showPasswordStep(n) {
    $all(".ns-dialog-step").forEach((s) => s.classList.toggle("is-active", Number(s.dataset.nsStep) === n));
    $all("#ns-dialog-steps span").forEach((s) => s.classList.toggle("is-done", Number(s.dataset.step) <= n));
  }
  function passwordStep1Next() {
    const user = CoreAuth.getUser();
    const current = $("#ns-pw-current").value;
    const error = $("#ns-pw-error-1");

    if (!current) {
      error.textContent = "Enter your current password.";
      return;
    }
    if (!user || current !== String(user.password || "")) {
      error.textContent = "Incorrect password. Try again.";
      return;
    }
    error.textContent = "";
    showPasswordStep(2);
  }
  function updateStrength(value) {
    const fill = $("#ns-pw-strength-fill");
    const label = $("#ns-pw-strength-label");
    if (!fill || !label) return;
    let score = 0;
    if (value.length >= 6) score++;
    if (value.length >= 10) score++;
    if (/[A-Z]/.test(value) && /[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    const levels = [
      { pct: "12%", color: "var(--ns-danger)", text: "Too short" },
      { pct: "40%", color: "var(--ns-danger)", text: "Weak" },
      { pct: "65%", color: "#ffb066", text: "Okay" },
      { pct: "85%", color: "#c8e06e", text: "Good" },
      { pct: "100%", color: "var(--ns-success)", text: "Strong" },
    ];
    const l = levels[Math.min(score, levels.length - 1)];
    fill.style.width = value ? l.pct : "0%";
    fill.style.background = l.color;
    label.textContent = value ? l.text : "Too short";
  }
  function passwordStep2Next() {
    const user = CoreAuth.getUser();
    const val = $("#ns-pw-new").value;
    const confirm = $("#ns-pw-confirm").value;
    const error = $("#ns-pw-error-2");

    if (val.length < 6) {
      error.textContent = "Use at least 6 characters.";
      return;
    }
    if (val !== confirm) {
      error.textContent = "Passwords don't match.";
      return;
    }
    if (user && val === String(user.password || "")) {
      error.textContent = "Choose a password you haven't used before.";
      return;
    }
    if (!user || !CoreAuth.saveUser({ ...user, password: val })) {
      error.textContent = "Couldn't save the new password. Try again.";
      return;
    }
    error.textContent = "";
    showPasswordStep(3);
    animateCheckmark();
    emitEvent("profile:changed", { password: true });
  }
  function animateCheckmark() {
    const path = $("#ns-check-path");
    if (!path || !path.getTotalLength) return;
    const len = path.getTotalLength();
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    path.animate(
      [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: 450, easing: "ease-out", fill: "forwards" }
    );
  }

  /* ----------------------------------------------------------------
     Search (sidebar "Find a setting")
  ---------------------------------------------------------------- */
  function bindSearch() {
    const input = $("#ns-search-input");
    if (!input) return;
    input.addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      $all(".ns-nav-item").forEach((item) => {
        const label = item.dataset.nsLabel || "";
        const match = !q || label.toLowerCase().includes(q);
        item.hidden = !match;
        const labelSpan = item.querySelector(".ns-nav-label");
        labelSpan.innerHTML =
          q && match
            ? escapeHTML(label).replace(
                new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"),
                "<mark>$1</mark>"
              )
            : escapeHTML(label);
      });
    });
  }

  /* ----------------------------------------------------------------
     Event delegation — set up once per mount, survives every re-render
     (listeners live on elements inside the window, so they are removed
     automatically when the core removes the window)
  ---------------------------------------------------------------- */
  function bindDelegatedEvents() {
    const content = $("#ns-content");

    APP.addEventListener("click", (e) => {
      const goEl = e.target.closest("[data-ns-go]");
      if (goEl) {
        navigate(goEl.dataset.nsGo.split("/"), { highlight: goEl.dataset.nsHighlight });
        return;
      }
      const crumbEl = e.target.closest("[data-ns-crumb]");
      if (crumbEl) {
        const idx = Number(crumbEl.dataset.nsCrumb);
        navigate(state.path.slice(0, idx));
        return;
      }
      const toggleEl = e.target.closest("[data-ns-toggle]");
      if (toggleEl && !toggleEl.disabled) {
        handleToggle(toggleEl);
        return;
      }
      const actionEl = e.target.closest("[data-ns-action]");
      if (actionEl && !actionEl.disabled) {
        handleAction(actionEl.dataset.nsAction, actionEl);
      }
    });

    content.addEventListener("input", (e) => {
      if (e.target.matches("[data-ns-slider]")) handleSlider(e.target);
      if (e.target.id === "ns-apps-search") {
        const q = e.target.value.trim().toLowerCase();
        $all("[data-ns-app-row]").forEach((row) => {
          row.style.display = row.dataset.name.includes(q) ? "" : "none";
        });
      }
    });

    content.addEventListener("change", (e) => {
      if (e.target.matches("[data-ns-select]")) handleSelect(e.target);
      if (e.target.matches("[data-ns-radio]")) handleRadio(e.target);
    });

    $("#ns-password-dialog").addEventListener("input", (e) => {
      if (e.target.id === "ns-pw-new") updateStrength(e.target.value);
    });
  }

  /* ----------------------------------------------------------------
     Mount / unmount — called from core window events
  ---------------------------------------------------------------- */
  function mount(root) {
    if (!root) return;

    mountId++;
    stopClock();

    APP = root;
    state = createState();

    applyTheme(state.theme, true);
    applyAccent(state.accent, true);
    syncProfileUI();
    bindDelegatedEvents();
    bindSearch();
    bindAvatarInput();
    navigate([]);
  }

  function unmount() {
    mountId++;
    stopClock();
    clearTimeout(toastTimer);
    APP = null;
    state = null;
  }

  /* ----------------------------------------------------------------
     Hook into the core
  ---------------------------------------------------------------- */

  // Replaces the core's placeholder "settings" app (same id).
  CoreApp.registerApplication({
    id: APP_ID,
    title: "Settings",
    width: 1000,
    height: 640,
    content: () => SETTINGS_HTML,
  });

  // Window Manager emits nexus:window:created after the window is in the DOM.
  document.addEventListener("nexus:window:created", (event) => {
    const win = event.detail;
    if (!win || win.appId !== APP_ID) return;
    mount(win.element.querySelector("#nexus-settings-app"));
  });

  document.addEventListener("nexus:window:closed", (event) => {
    const win = event.detail;
    if (win && win.appId === APP_ID) unmount();
  });

  // Small public surface for other modules
  window.NexusSettings = {
    open() {
      window.Nexus?.openApplication(APP_ID);
    },
    navigate(path) {
      if (!APP) return;
      navigate(Array.isArray(path) ? path : String(path).split("/"));
    },
  };
})();