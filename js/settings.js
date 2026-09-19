(function () {
  "use strict";

  if (window.NexusSettings) return; // guard against double-injection

  const APP = document.getElementById("nexus-settings-app");
  if (!APP) return;

    //  Labels + accent palette (single source of truth for breadcrumbs/nav)
    
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

  const CoreState = window.nexusStateManager || null;
  const CoreAuth = window.nexusAuthManager || null;
  const CoreWindow = window.nexusWindowManager || null;
  const CoreApp = window.nexusAppManager || null;
  const CoreEvents = window.nexusEventSystem || window.nexusEventBus || null;

  // Reads one setting. Core's bag first, local fallback only if Core isn't here yet.
  function readSetting(key, fallback) {
    if (CoreState && typeof CoreState.getSettings === "function") {
      const all = CoreState.getSettings() || {};
      return key in all ? all[key] : fallback;
    }
    const raw = localStorage.getItem("ns-fallback-" + key);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch (e) { return raw; }
  }

  // Writes one setting through Core (which is expected to notify the Event
  // System itself). Only emits manually when Core isn't present, so we
  // don't double-notify once the real State Manager is wired in.
  function writeSetting(key, value) {
    if (CoreState && typeof CoreState.updateSetting === "function") {
      CoreState.updateSetting(key, value);
    } else {
      localStorage.setItem("ns-fallback-" + key, JSON.stringify(value));
      emitEvent("settings:changed", { key, value });
    }
  }

  function emitEvent(name, detail) {
    if (CoreEvents && typeof CoreEvents.emit === "function") {
      CoreEvents.emit(name, detail);
    } else {
      document.dispatchEvent(new CustomEvent("nexus:" + name, { detail }));
    }
  }

  function getCurrentUser() {
    if (CoreAuth && typeof CoreAuth.getUser === "function") {
      const u = CoreAuth.getUser() || {};
      return { name: u.name || "Alex", username: u.username || u.email || "alex@nexus", avatar: u.avatar || "" };
    }
    return {
      name: readSetting("profile-name", "Alex"),
      username: readSetting("profile-username", "alex@nexus"),
      avatar: readSetting("profile-avatar", ""),
    };
  }

  // Identity fields (name/username/avatar) are supposed to live in Auth,
  // per the doc — GUESSED updateUser() signature, confirm with Core owner.
  function updateCurrentUser(patch) {
    if (CoreAuth && typeof CoreAuth.updateUser === "function") {
      CoreAuth.updateUser(patch);
    } else {
      if ("name" in patch) writeSetting("profile-name", patch.name);
      if ("username" in patch) writeSetting("profile-username", patch.username);
      if ("avatar" in patch) writeSetting("profile-avatar", patch.avatar);
    }
    emitEvent("profile:changed", patch);
  }

  // Old localStorage-keyed persist() calls all through this file now route
  // through the adapter above instead of owning a second settings system.
  function persist(key, value) {
    writeSetting(key.replace(/^ns-/, ""), value);
  }

  const state = {
    path: [], // e.g. ["system", "display"]
    pendingHighlight: null,
    theme: readSetting("theme", "dark"),
    accent: readSetting("accent", "amber"),
    wallpaper: readSetting("wallpaper", "1"),
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
    sliders: Object.assign(
      { brightness: 80, volume: 62 },
      readSetting("sliders", {})
    ),
    storage: Object.assign(
      { apps: 18, docs: 12, media: 26, system: 12 }, // % of capacity, sums to "used"
      readSetting("storage", {})
    ),
    btDevices: [
      { id: "buds", name: "Nexus Buds Pro", type: "Audio", connected: true },
      { id: "kbd", name: "Nexus Keyboard", type: "Input", connected: true },
    ],
    scanning: false,
    clockTimer: null,
  };

    //  Small helpers
    
  const $ = (sel, ctx) => (ctx || APP).querySelector(sel);
  const $all = (sel, ctx) => Array.from((ctx || APP).querySelectorAll(sel));

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  /* ----------------------------------------------------------------------
     Theme + accent
     -------------------------------------------------------------------- */
  function applyTheme(theme) {
    let resolved = theme;
    if (theme === "system") {
      resolved = window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    APP.dataset.nsTheme = resolved;
    state.theme = theme;
    persist("ns-theme", theme);
  }

  function applyAccent(id) {
    const palette = ACCENTS[id] || ACCENTS.amber;
    APP.style.setProperty("--ns-accent-1", palette.c1);
    APP.style.setProperty("--ns-accent-2", palette.c2);
    APP.style.setProperty("--ns-accent-solid", palette.c2);
    APP.dataset.nsAccent = id;
    state.accent = id;
    persist("ns-accent", id);
  }

  function setThemeWithTransition(theme) {
    if (document.startViewTransition) {
      document.startViewTransition(() => applyTheme(theme));
    } else {
      applyTheme(theme);
    }
  }

 
    //  Navigation: path array + breadcrumbs
   
  function navigate(path, opts) {
    state.path = path;
    state.pendingHighlight = (opts && opts.highlight) || null;
    renderCrumbs();
    renderContent();
    syncSidebar();
  }

  function renderCrumbs() {
    const crumbs = $("#ns-crumbs");
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


    //  Reusable markup fragments
    
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

  /* ----------------------------------------------------------------------
     Page renderers — each returns an HTML string for #ns-content
     -------------------------------------------------------------------- */
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
    const avatarInner = p.avatar ? `<img src="${p.avatar}" alt="">` : (p.name[0] || "A").toUpperCase();
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
          <div class="ns-row-text"><strong>Password</strong><small>Last changed a while ago</small></div>
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

  
    //  Content dispatcher
    
  function renderContent() {
    const content = $("#ns-content");
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
    void content.offsetWidth; // reflow
    content.classList.add("ns-content");
    content.innerHTML = render();

    stopClock();
    if (key === "timelanguage") startClock();
    if (state.pendingHighlight) {
      const target = key === "personalization" && state.pendingHighlight === "theme" ? $("#ns-theme-section") : null;
      if (target) {
        target.classList.add("ns-flash");
        target.scrollIntoView({ block: "nearest" });
      }
      state.pendingHighlight = null;
    }
  }
  
    //  Clock (Time & language page)
  function tickClock() {
    const now = new Date();
    const timeEl = $("#ns-clock");
    const dateEl = $("#ns-clock-date");
    if (!timeEl) return;
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
    tickClock();
    state.clockTimer = setInterval(tickClock, 1000);
  }
  function stopClock() {
    if (state.clockTimer) {
      clearInterval(state.clockTimer);
      state.clockTimer = null;
    }
  }

    //  Toast
  let toastTimer = null;
  function showToast(message) {
    const toast = $("#ns-toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

    //  Toggle / slider / select / radio handling (all delegated on #ns-content)
  function handleToggle(el) {
    const key = el.dataset.nsToggle;

    // Bluetooth per-device switches are handled separately (not in state.toggles)
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
      $("#ns-brightness-output").textContent = value + "%";
      const dim = $("#ns-preview-dim");
      if (dim) dim.style.opacity = (100 - value) / 130;
    }
    if (key === "volume") {
      $("#ns-volume-output").textContent = value + "%";
      const wave = $("#ns-wave");
      if (wave) wave.classList.toggle("is-paused", value === 0);
    }
  }

  function handleSelect(el) {
    // Cosmetic in this demo — the selection itself is the deliverable;
    // wiring to real OS behaviour happens where each app owns that state.
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
        persist("ns-wallpaper", state.wallpaper); // → State Manager → its own Event System notification
        renderContent();
        showToast("Wallpaper updated");
        break;

      case "scan-device": {
        state.scanning = true;
        renderContent();
        setTimeout(() => {
          state.scanning = false;
          const pool = [
            { name: "Nexus Mouse", type: "Input" },
            { name: "Nexus Speaker", type: "Audio" },
            { name: "Nexus Webcam", type: "Input" },
          ];
          const already = new Set(state.btDevices.map((d) => d.name));
          const next = pool.find((p) => !already.has(p.name));
          if (next) {
            state.btDevices.push({ id: next.name.toLowerCase().replace(/\s+/g, "-"), name: next.name, type: next.type, connected: false });
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
        setTimeout(() => {
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
        const status = $("#ns-update-status");
        setTimeout(() => {
          status.textContent = "Installing Nexus 1.1…";
          setTimeout(() => {
            status.textContent = "Restart to finish installing";
            el.textContent = "Restart now";
            el.disabled = false;
          }, 1200);
        }, 1000);
        break;
      }

      case "clear-history":
        el.textContent = "Cleared ✓";
        el.disabled = true;
        setTimeout(() => {
          el.textContent = "Clear";
          el.disabled = false;
        }, 1800);
        break;

      case "uninstall":
        showToast(el.dataset.app + " uninstalled");
        el.closest("[data-ns-app-row]")?.remove();
        break;

      case "avatar-trigger":
        $("#ns-avatar-input").click();
        break;

      case "save-profile": {
        const name = $("#ns-name-input").value.trim() || "Alex";
        const username = $("#ns-username-input").value.trim() || "alex@nexus";
        state.profile.name = name;
        state.profile.username = username;
        updateCurrentUser({ name, username }); // identity → Auth Manager, not the settings bag
        syncProfileUI();
        showToast("Profile updated");
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

      case "minimize":
        if (CoreWindow && typeof CoreWindow.minimize === "function") {
          CoreWindow.minimize("settings");
        } else {
          emitEvent("window-minimize", { app: "settings" });
        }
        break;
      case "maximize":
        if (CoreWindow && typeof CoreWindow.maximize === "function") {
          CoreWindow.maximize("settings");
        } else {
          APP.classList.toggle("is-maximized");
        }
        break;
      case "close":
        closeWindow();
        break;
    }
  }

  function syncProfileUI() {
    $("#ns-sidebar-name").textContent = state.profile.name;
    const initial = (state.profile.name[0] || "A").toUpperCase();
    const sidebarAvatar = $("#ns-sidebar-avatar");
    const pageAvatar = $("#ns-page-avatar");
    [sidebarAvatar, pageAvatar].forEach((node) => {
      if (!node) return;
      node.innerHTML = state.profile.avatar ? `<img src="${state.profile.avatar}" alt="">` : initial;
    });
  }

  function bindAvatarInput() {
    $("#ns-avatar-input").addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        state.profile.avatar = reader.result;
        updateCurrentUser({ avatar: state.profile.avatar }); // identity → Auth Manager
        syncProfileUI();
        showToast("Profile photo updated");
      };
      reader.readAsDataURL(file);
    });
  }

    //  Change-password dialog
  
  function openPasswordDialog() {
    const dialog = $("#ns-password-dialog");
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
    $("#ns-password-dialog").close();
  }
  function showPasswordStep(n) {
    $all(".ns-dialog-step").forEach((s) => s.classList.toggle("is-active", Number(s.dataset.nsStep) === n));
    $all("#ns-dialog-steps span").forEach((s) => s.classList.toggle("is-done", Number(s.dataset.step) <= n));
  }
  function passwordStep1Next() {
    const current = $("#ns-pw-current").value;
    if (current.length < 4) {
      $("#ns-pw-error-1").textContent = "Enter your current password.";
      return;
    }
    $("#ns-pw-error-1").textContent = "";
    showPasswordStep(2);
  }
  function updateStrength(value) {
    const fill = $("#ns-pw-strength-fill");
    const label = $("#ns-pw-strength-label");
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
    const val = $("#ns-pw-new").value;
    const confirm = $("#ns-pw-confirm").value;
    if (val.length < 6) {
      $("#ns-pw-error-2").textContent = "Use at least 6 characters.";
      return;
    }
    if (val !== confirm) {
      $("#ns-pw-error-2").textContent = "Passwords don't match.";
      return;
    }
    $("#ns-pw-error-2").textContent = "";
    showPasswordStep(3);
    animateCheckmark();
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

  function closeWindow() {
    if (CoreWindow && typeof CoreWindow.close === "function") {
      CoreWindow.close("settings");
      return;
    }
    // No Window Manager wired in yet — fall back to handling it ourselves
    const anim = APP.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: "translate(46%, -46%) scale(0.06)", opacity: 0 },
      ],
      { duration: 420, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }
    );
    anim.onfinish = () => {
      APP.style.display = "none";
      $("#ns-reopen-pill").hidden = false;
      emitEvent("window-close", { app: "settings" });
    };
  }

  function reopenWindow() {
    if (CoreWindow && typeof CoreWindow.open === "function") {
      CoreWindow.open("settings");
      return;
    }
    APP.style.display = "";
    $("#ns-reopen-pill").hidden = true;
    APP.animate(
      [
        { transform: "translate(46%, -46%) scale(0.06)", opacity: 0 },
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
      ],
      { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
    );
  }

  
    //  Search (sidebar "Find a setting")
  function bindSearch() {
    $("#ns-search-input").addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      $all(".ns-nav-item").forEach((item) => {
        const label = item.dataset.nsLabel || "";
        const match = !q || label.toLowerCase().includes(q);
        item.hidden = !match;
        const labelSpan = item.querySelector(".ns-nav-label");
        labelSpan.innerHTML = q && match
          ? escapeHTML(label).replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"), "<mark>$1</mark>")
          : escapeHTML(label);
      });
    });
  }

  
    //  Event delegation — set up once, survives every innerHTML re-render
    
  function bindDelegatedEvents() {
    const content = $("#ns-content");

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("#ns-password-dialog").open) closePasswordDialog();
    });

    // Sidebar + crumbs use data-ns-go / data-ns-crumb, content uses data-ns-go too
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

    $("#ns-reopen-pill").addEventListener("click", reopenWindow);
  }

    //  Init
    
  let initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;

    applyTheme(state.theme);
    applyAccent(state.accent);
    syncProfileUI();
    bindDelegatedEvents();
    bindSearch();
    bindAvatarInput();
    navigate([]);

    // Register with App Manager so it (not this file) owns app lifecycle.
    // GUESSED signature — confirm the real one with whoever owns Core.
    if (CoreApp && typeof CoreApp.register === "function") {
      CoreApp.register({
        id: "settings",
        name: "Settings",
        icon: "⚙",
        open: reopenWindow,
        close: closeWindow,
      });
    }
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);

  // Small public surface, in case the window manager needs to reach in
  window.NexusSettings = {
    open: reopenWindow,
    close: closeWindow,
    navigate,
  };
})();