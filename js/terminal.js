/* ================================================================
   NEXUS TERMINAL APPLICATION
   Modular Command Shell for Nexus OS
================================================================ */

(function () {
    "use strict";

    if (window.NexusTerminal) return;

    const CoreState = window.nexusStateManager || null;
    const CoreApp = window.nexusAppManager || null;

    if (!CoreApp) {
        console.error("Nexus Terminal: Core App Manager not found. Load after app-manager.js.");
        return;
    }

    const APP_ID = "terminal";

    /* ----------------------------------------------------------------
       Helper: Get Active User
    ---------------------------------------------------------------- */
    function getUsername() {
        const user = window.nexusStateManager?.getUser();
        if (user && user.name) {
            return user.name.toLowerCase().replace(/[^a-z0-9_]/g, "");
        }
        return "user";
    }

    /* ----------------------------------------------------------------
       Terminal HTML Template
    ---------------------------------------------------------------- */
    function getTerminalHTML() {
        const user = getUsername();
        return `
        <div class="nexus-terminal-app" id="nexus-terminal-app">
            <div class="terminal-body" id="terminal-body">
                <div class="terminal-banner">
                    <div class="terminal-banner-title">Nexus OS Terminal [Core Shell v1.0.0]</div>
                    <div class="terminal-banner-sub">Type <span style="color: #ff9f43; font-weight: bold;">help</span> for a list of available system commands.</div>
                </div>

                <div id="terminal-history"></div>

                <div class="terminal-input-row" id="terminal-active-row">
                    <span class="terminal-prompt-user">${user}@nexus</span>:<span class="terminal-prompt-path">~$</span>
                    <div class="terminal-input-field-wrapper">
                        <span class="terminal-input-display" id="terminal-input-display"></span><span class="terminal-cursor"></span>
                        <input type="text" class="terminal-input" id="terminal-command-input" autocomplete="off" spellcheck="false" autofocus>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    /* ----------------------------------------------------------------
       Terminal Controller
    ---------------------------------------------------------------- */
    function initTerminalInstance(rootElement) {
        if (!rootElement) return;

        const terminalBody = rootElement.querySelector("#terminal-body");
        const historyContainer = rootElement.querySelector("#terminal-history");
        const inputDisplay = rootElement.querySelector("#terminal-input-display");
        const commandInput = rootElement.querySelector("#terminal-command-input");
        const promptUser = rootElement.querySelector(".terminal-prompt-user");

        let commandHistory = [];
        let historyIndex = -1;
        const availableCommands = [
            "help", "clear", "date", "time", "apps", "files", "about",
            "open", "whoami", "echo", "history", "exit", "cls"
        ];

        // Ensure input is focused when clicking anywhere in terminal
        rootElement.addEventListener("click", () => {
            commandInput.focus();
        });

        // Sync prompt user if changed
        const currentUsername = getUsername();
        if (promptUser) {
            promptUser.textContent = `${currentUsername}@nexus`;
        }

        // Live input mirror for styled text display before the cursor
        commandInput.addEventListener("input", () => {
            inputDisplay.textContent = commandInput.value;
        });

        /* ------------------------------------------------------------
           Scroll to Bottom Helper
        ------------------------------------------------------------ */
        function scrollToBottom() {
            setTimeout(() => {
                terminalBody.scrollTop = terminalBody.scrollHeight;
            }, 10);
        }

        /* ------------------------------------------------------------
           Print Output Row
        ------------------------------------------------------------ */
        function appendOutput(commandText, responseHtml, isHtml = true, typeClass = "") {
            const user = getUsername();
            const row = document.createElement("div");
            row.className = "terminal-row";

            if (commandText !== null) {
                const cmdLine = document.createElement("div");
                cmdLine.className = "terminal-command-line";
                cmdLine.innerHTML = `<span class="terminal-prompt-user">${user}@nexus</span>:<span class="terminal-prompt-path">~$</span> <span class="terminal-command-text">${escapeHtml(commandText)}</span>`;
                row.appendChild(cmdLine);
            }

            if (responseHtml) {
                const respDiv = document.createElement("div");
                respDiv.className = `terminal-response ${typeClass}`;
                if (isHtml) {
                    respDiv.innerHTML = responseHtml;
                } else {
                    respDiv.textContent = responseHtml;
                }
                row.appendChild(respDiv);
            }

            historyContainer.appendChild(row);
            scrollToBottom();
        }

        /* ------------------------------------------------------------
           Command Execution Dispatcher
        ------------------------------------------------------------ */
        function executeCommand(rawInput) {
            const trimmed = rawInput.trim();
            if (!trimmed) {
                appendOutput("", "");
                return;
            }

            commandHistory.push(trimmed);
            historyIndex = commandHistory.length;

            const parts = trimmed.split(/\s+/);
            const cmd = parts[0].toLowerCase();
            const args = parts.slice(1);

            switch (cmd) {
                case "help": {
                    const helpHTML = `
<div class="terminal-table">
  <div class="terminal-table-row"><div class="terminal-table-cmd">help</div><div class="terminal-table-desc">Display available Nexus OS terminal commands</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">clear / cls</div><div class="terminal-table-desc">Clear the terminal screen buffer</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">date</div><div class="terminal-table-desc">Display the current system date</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">time</div><div class="terminal-table-desc">Display current live system time</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">apps</div><div class="terminal-table-desc">List all installed Nexus applications and status</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">files</div><div class="terminal-table-desc">List files and folders in workspace storage</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">about</div><div class="terminal-table-desc">Show Nexus OS system info and version</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">open &lt;app&gt;</div><div class="terminal-table-desc">Launch an app (e.g. open notepad, open settings)</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">whoami</div><div class="terminal-table-desc">Print current logged in username</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">echo &lt;text&gt;</div><div class="terminal-table-desc">Print text arguments to terminal output</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">history</div><div class="terminal-table-desc">Show list of recently used commands</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">exit</div><div class="terminal-table-desc">Close the terminal window</div></div>
</div>`;
                    appendOutput(trimmed, helpHTML, true);
                    break;
                }

                case "clear":
                case "cls": {
                    historyContainer.innerHTML = "";
                    break;
                }

                case "date": {
                    const now = new Date();
                    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                    const dateStr = now.toLocaleDateString(undefined, options);
                    appendOutput(trimmed, `📅 ${dateStr}`, false, "info");
                    break;
                }

                case "time": {
                    const now = new Date();
                    const timeStr = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    appendOutput(trimmed, `🕒 Current Time: ${timeStr}`, false, "info");
                    break;
                }

                case "apps": {
                    const appsHTML = `
<div class="terminal-table">
  <div class="terminal-table-row"><div class="terminal-table-cmd">notepad / notes</div><div class="terminal-table-desc">Modern Text Editor [Ready]</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">calculator / calc</div><div class="terminal-table-desc">Standard Calculator [Ready]</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">taskmanager / tasks</div><div class="terminal-table-desc">Process & System Monitor [Ready]</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">terminal</div><div class="terminal-table-desc">Command Line Shell [Active]</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">settings</div><div class="terminal-table-desc">System Preferences [Ready]</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">files</div><div class="terminal-table-desc">File & Directory Browser [Ready]</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">browser</div><div class="terminal-table-desc">Nexus Web Browser [Ready]</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">projects</div><div class="terminal-table-desc">Project Management [Ready]</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">trash</div><div class="terminal-table-desc">Recycle Bin [Ready]</div></div>
  <div class="terminal-table-row"><div class="terminal-table-cmd">about</div><div class="terminal-table-desc">Nexus System Overview [Ready]</div></div>
</div>
<div style="margin-top: 6px; color: #8b949e; font-size: 12px;">Tip: Launch any application with <span style="color: #ff9f43;">open &lt;app_name&gt;</span></div>`;
                    appendOutput(trimmed, appsHTML, true);
                    break;
                }

                case "files": {
                    let notesList = [];
                    try {
                        const raw = localStorage.getItem("nexus_notepad_notes");
                        if (raw) notesList = JSON.parse(raw);
                    } catch (e) {}

                    let notesListing = "";
                    if (notesList.length > 0) {
                        notesListing = notesList.map(n => `  -rw-r--r-- 1 ${getUsername()} nexus  ${(n.content || "").length}B  Notes/${escapeHtml(n.title || "Untitled.txt")}`).join("\n");
                    } else {
                        notesListing = `  -rw-r--r-- 1 ${getUsername()} nexus  180B  Notes/Welcome to Nexus.txt`;
                    }

                    const filesHTML = `
drwxr-xr-x 4 ${getUsername()} nexus 4.0K Documents/
drwxr-xr-x 2 ${getUsername()} nexus 4.0K Downloads/
drwxr-xr-x 3 ${getUsername()} nexus 4.0K Projects/
drwxr-xr-x 2 ${getUsername()} nexus 4.0K Notes/
${notesListing}
-rw-r--r-- 1 ${getUsername()} nexus  512B system.config
-rw-r--r-- 1 ${getUsername()} nexus  1.2K README.md`;
                    appendOutput(trimmed, filesHTML, false);
                    break;
                }

                case "about": {
                    const user = window.nexusStateManager?.getUser()?.name || "Nexus User";
                    const aboutHTML = `
<div style="color: #ffb66b; font-weight: bold;">═════════════════════════════════════════════════════</div>
<div style="color: #ff9f43; font-weight: bold; font-size: 14px;">  NEXUS OPERATING SYSTEM</div>
<div style="color: #ffb66b; font-weight: bold;">═════════════════════════════════════════════════════</div>
  OS Version:     Nexus OS 1.0 (Web Edition)
  Kernel:         Nexus JavaScript Windowing & Process Engine
  Architecture:   Modular Component System
  Aesthetic:      Dark Glassmorphism & Adaptive Accent
  Active User:    <span style="color: #7ee787;">${escapeHtml(user)}</span>
  System Status:  <span style="color: #7ee787;">ONLINE / ALL SERVICES ACTIVE</span>
<div style="color: #ffb66b; font-weight: bold;">═════════════════════════════════════════════════════</div>`;
                    appendOutput(trimmed, aboutHTML, true);
                    break;
                }

                case "open": {
                    if (args.length === 0) {
                        appendOutput(trimmed, "Usage: open <app_name> (e.g. open notepad, open settings, open browser)", false, "error");
                        break;
                    }
                    const targetApp = args[0].toLowerCase();
                    const appMap = {
                        notepad: "notes",
                        notes: "notes",
                        calculator: "calculator",
                        calc: "calculator",
                        taskmanager: "taskmanager",
                        tasks: "taskmanager",
                        terminal: "terminal",
                        settings: "settings",
                        files: "files",
                        browser: "browser",
                        projects: "projects",
                        trash: "trash",
                        about: "about"
                    };

                    const resolvedId = appMap[targetApp] || targetApp;
                    if (window.Nexus?.openApplication) {
                        const opened = window.Nexus.openApplication(resolvedId);
                        if (opened) {
                            appendOutput(trimmed, `Launching ${targetApp}...`, false, "success");
                        } else {
                            appendOutput(trimmed, `App '${targetApp}' not found. Type 'apps' to see all applications.`, false, "error");
                        }
                    } else {
                        appendOutput(trimmed, `Cannot launch ${targetApp} - App manager unavailable.`, false, "error");
                    }
                    break;
                }

                case "whoami": {
                    const user = window.nexusStateManager?.getUser()?.name || "user";
                    appendOutput(trimmed, `${user} [Nexus Administrator / Local Session]`, false, "info");
                    break;
                }

                case "echo": {
                    const echoText = args.join(" ");
                    appendOutput(trimmed, echoText, false);
                    break;
                }

                case "history": {
                    if (commandHistory.length === 0) {
                        appendOutput(trimmed, "No command history.", false);
                    } else {
                        const historyList = commandHistory.map((c, i) => `  ${i + 1}  ${escapeHtml(c)}`).join("\n");
                        appendOutput(trimmed, historyList, false);
                    }
                    break;
                }

                case "exit": {
                    appendOutput(trimmed, "Exiting terminal session...", false, "info");
                    // Find window element and close it
                    const winEl = rootElement.closest(".nexus-window");
                    if (winEl && winEl.dataset.windowId && window.nexusWindowManager) {
                        window.nexusWindowManager.closeWindow(winEl.dataset.windowId);
                    }
                    break;
                }

                default: {
                    appendOutput(trimmed, `nexus: command not found: ${escapeHtml(cmd)}. Type 'help' for available commands.`, false, "error");
                    break;
                }
            }
        }

        /* ------------------------------------------------------------
           Keydown Event Handler
        ------------------------------------------------------------ */
        commandInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                const cmd = commandInput.value;
                commandInput.value = "";
                inputDisplay.textContent = "";
                executeCommand(cmd);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (commandHistory.length > 0) {
                    if (historyIndex > 0) historyIndex--;
                    commandInput.value = commandHistory[historyIndex] || "";
                    inputDisplay.textContent = commandInput.value;
                }
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                if (historyIndex < commandHistory.length - 1) {
                    historyIndex++;
                    commandInput.value = commandHistory[historyIndex] || "";
                } else {
                    historyIndex = commandHistory.length;
                    commandInput.value = "";
                }
                inputDisplay.textContent = commandInput.value;
            } else if (e.key === "Tab") {
                e.preventDefault();
                const current = commandInput.value.trim().toLowerCase();
                if (current) {
                    const match = availableCommands.find(c => c.startsWith(current));
                    if (match) {
                        commandInput.value = match;
                        inputDisplay.textContent = match;
                    }
                }
            }
        });

        // Auto focus
        setTimeout(() => commandInput.focus(), 50);
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /* ----------------------------------------------------------------
       Register Application with Nexus App Manager
    ---------------------------------------------------------------- */
    CoreApp.registerApplication({
        id: APP_ID,
        title: "Nexus Terminal",
        width: 760,
        height: 480,
        content: () => getTerminalHTML()
    });

    /* ----------------------------------------------------------------
       Window Creation Hook
    ---------------------------------------------------------------- */
    document.addEventListener("nexus:window:created", (event) => {
        const win = event.detail;
        if (!win || win.appId !== APP_ID) return;
        const terminalRoot = win.element.querySelector("#nexus-terminal-app");
        if (terminalRoot) {
            initTerminalInstance(terminalRoot);
        }
    });

    window.NexusTerminal = {
        open() {
            window.Nexus?.openApplication(APP_ID);
        }
    };

    console.log("Nexus Terminal Module loaded.");
})();
