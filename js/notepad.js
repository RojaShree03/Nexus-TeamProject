/* ================================================================
   NEXUS NOTEPAD APPLICATION
   Modular Text Editor for Nexus OS
================================================================ */

(function () {
    "use strict";

    if (window.NexusNotepad) return;

    const CoreState = window.nexusStateManager || null;
    const CoreApp = window.nexusAppManager || null;

    if (!CoreApp) {
        console.error("Nexus Notepad: Core App Manager not found. Load after app-manager.js.");
        return;
    }

    const APP_ID = "notes";
    const APP_ALIAS = "notepad";
    const STORAGE_KEY = "nexus_notepad_notes";

    /* ----------------------------------------------------------------
       Default initial template
    ---------------------------------------------------------------- */
    const DEFAULT_NOTE = {
        id: "default-note",
        title: "Welcome to Nexus.txt",
        content: `Welcome to Nexus OS Notepad!

This is a modern, responsive text editor built for Nexus OS.

Features:
• New, Open, Save, and Save As capabilities
• Live Word Count and Character Count
• Local Storage sync for persistent notes
• Import from and Export (.txt) to your PC
• Keyboard shortcut support (Ctrl+S to save)

Enjoy your flow on Nexus OS!`,
        updatedAt: new Date().toISOString()
    };

    /* ----------------------------------------------------------------
       Notepad HTML Template
    ---------------------------------------------------------------- */
    function getNotepadHTML() {
        return `
        <div class="nexus-notepad-app" id="nexus-notepad-app">
            <!-- Toolbar -->
            <div class="notepad-toolbar">
                <div class="notepad-actions">
                    <button type="button" class="notepad-btn" id="notepad-btn-new" title="New Document (Ctrl+N)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        <span>New</span>
                    </button>

                    <button type="button" class="notepad-btn" id="notepad-btn-open" title="Open Note / File (Ctrl+O)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span>Open</span>
                    </button>

                    <button type="button" class="notepad-btn btn-accent" id="notepad-btn-save" title="Save Note (Ctrl+S)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                        <span>Save</span>
                    </button>

                    <button type="button" class="notepad-btn" id="notepad-btn-saveas" title="Save As / Download to PC">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span>Save As</span>
                    </button>
                </div>

                <div class="notepad-meta">
                    <input type="text" class="notepad-title-input" id="notepad-title" value="Untitled Note.txt" placeholder="Note title..." spellcheck="false">
                    <span class="notepad-doc-badge" id="notepad-badge">Saved</span>
                </div>
            </div>

            <!-- Editor Body -->
            <div class="notepad-editor-body">
                <textarea class="notepad-textarea" id="notepad-textarea" placeholder="Start typing your note here..." spellcheck="true"></textarea>
            </div>

            <!-- Status Bar -->
            <div class="notepad-statusbar">
                <div class="notepad-stats">
                    <div class="notepad-stat-item">
                        <span>Words:</span>
                        <span class="notepad-stat-value" id="notepad-word-count">0</span>
                    </div>
                    <div class="notepad-stat-item">
                        <span>Characters:</span>
                        <span class="notepad-stat-value" id="notepad-char-count">0</span>
                    </div>
                    <div class="notepad-stat-item">
                        <span>Lines:</span>
                        <span class="notepad-stat-value" id="notepad-line-count">1</span>
                    </div>
                </div>

                <div class="notepad-status-info">
                    <span id="notepad-cursor-pos">Ln 1, Col 1</span>
                    <span>UTF-8</span>
                </div>
            </div>

            <!-- Hidden File Input for Open from disk -->
            <input type="file" id="notepad-file-input" accept=".txt,.md,.js,.json,.html,.css" style="display:none;">

            <!-- Open Notes Modal -->
            <div class="notepad-modal-overlay" id="notepad-open-modal">
                <div class="notepad-modal">
                    <div class="notepad-modal-header">
                        <h3>Open Note</h3>
                        <button type="button" class="notepad-modal-close" id="notepad-modal-close" aria-label="Close">✕</button>
                    </div>

                    <div style="padding: 10px 14px 0;">
                        <button type="button" class="notepad-btn" id="notepad-btn-import-pc" style="width: 100%; justify-content: center; margin-bottom: 8px;">
                            📁 Browse File from PC...
                        </button>
                    </div>

                    <div class="notepad-saved-list" id="notepad-saved-list">
                        <!-- Saved notes populated dynamically -->
                    </div>
                </div>
            </div>

            <!-- Toast Notification -->
            <div class="notepad-toast" id="notepad-toast">Note saved successfully!</div>
        </div>
        `;
    }

    /* ----------------------------------------------------------------
       Storage Helper
    ---------------------------------------------------------------- */
    function getStoredNotes() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                return JSON.parse(raw);
            }
        } catch (e) {
            console.error("Failed to load notes from storage", e);
        }
        return [DEFAULT_NOTE];
    }

    function saveStoredNotes(notes) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
        } catch (e) {
            console.error("Failed to save notes to storage", e);
        }
    }

    /* ----------------------------------------------------------------
       Notepad Instance Handler
    ---------------------------------------------------------------- */
    function initNotepadInstance(rootElement) {
        if (!rootElement) return;

        const titleInput = rootElement.querySelector("#notepad-title");
        const textarea = rootElement.querySelector("#notepad-textarea");
        const wordCountEl = rootElement.querySelector("#notepad-word-count");
        const charCountEl = rootElement.querySelector("#notepad-char-count");
        const lineCountEl = rootElement.querySelector("#notepad-line-count");
        const cursorPosEl = rootElement.querySelector("#notepad-cursor-pos");
        const badgeEl = rootElement.querySelector("#notepad-badge");
        const toastEl = rootElement.querySelector("#notepad-toast");

        const btnNew = rootElement.querySelector("#notepad-btn-new");
        const btnOpen = rootElement.querySelector("#notepad-btn-open");
        const btnSave = rootElement.querySelector("#notepad-btn-save");
        const btnSaveAs = rootElement.querySelector("#notepad-btn-saveas");
        const fileInput = rootElement.querySelector("#notepad-file-input");
        const btnImportPC = rootElement.querySelector("#notepad-btn-import-pc");

        const modalOverlay = rootElement.querySelector("#notepad-open-modal");
        const modalClose = rootElement.querySelector("#notepad-modal-close");
        const savedList = rootElement.querySelector("#notepad-saved-list");

        let currentNoteId = "default-note";
        let isModified = false;
        let toastTimeout = null;

        // Load initial default note if present
        const notes = getStoredNotes();
        const initial = notes[0] || DEFAULT_NOTE;
        titleInput.value = initial.title || "Untitled Note.txt";
        textarea.value = initial.content || "";
        currentNoteId = initial.id || ("note-" + Date.now());
        updateStats();
        setModifiedState(false);

        /* ------------------------------------------------------------
           Word & Character Count Calculation
        ------------------------------------------------------------ */
        function updateStats() {
            const text = textarea.value;

            // Character count (length)
            const charCount = text.length;
            charCountEl.textContent = charCount.toLocaleString();

            // Word count (split on whitespace sequences)
            const words = text.trim().length > 0 ? text.trim().split(/\s+/).length : 0;
            wordCountEl.textContent = words.toLocaleString();

            // Line count
            const lines = text.split("\n").length;
            lineCountEl.textContent = lines.toLocaleString();

            // Cursor line and column
            const selStart = textarea.selectionStart || 0;
            const textUpToCursor = text.substring(0, selStart);
            const currentLine = textUpToCursor.split("\n").length;
            const currentCol = selStart - textUpToCursor.lastIndexOf("\n");
            cursorPosEl.textContent = `Ln ${currentLine}, Col ${currentCol}`;
        }

        function setModifiedState(modified) {
            isModified = modified;
            if (modified) {
                badgeEl.textContent = "Unsaved";
                badgeEl.classList.add("unsaved");
            } else {
                badgeEl.textContent = "Saved";
                badgeEl.classList.remove("unsaved");
            }
        }

        function showToast(message) {
            if (!toastEl) return;
            toastEl.textContent = message;
            toastEl.classList.add("show");
            clearTimeout(toastTimeout);
            toastTimeout = setTimeout(() => {
                toastEl.classList.remove("show");
            }, 2400);
        }

        /* ------------------------------------------------------------
           New Note Action
        ------------------------------------------------------------ */
        function handleNew() {
            if (isModified) {
                const confirmDiscard = window.confirm("You have unsaved changes. Start a new note anyway?");
                if (!confirmDiscard) return;
            }
            currentNoteId = "note-" + Date.now();
            titleInput.value = "Untitled Note.txt";
            textarea.value = "";
            textarea.focus();
            updateStats();
            setModifiedState(false);
            showToast("Created new document");
        }

        /* ------------------------------------------------------------
           Save Note Action
        ------------------------------------------------------------ */
        function handleSave() {
            const title = (titleInput.value || "Untitled Note.txt").trim();
            const content = textarea.value;

            const existingNotes = getStoredNotes();
            const idx = existingNotes.findIndex(n => n.id === currentNoteId);

            const noteObj = {
                id: currentNoteId,
                title: title,
                content: content,
                updatedAt: new Date().toISOString()
            };

            if (idx >= 0) {
                existingNotes[idx] = noteObj;
            } else {
                existingNotes.unshift(noteObj);
            }

            saveStoredNotes(existingNotes);
            setModifiedState(false);
            showToast(`Saved "${title}"`);
        }

        /* ------------------------------------------------------------
           Save As Action
        ------------------------------------------------------------ */
        function handleSaveAs() {
            let defaultName = titleInput.value.trim() || "My Note.txt";
            if (!defaultName.endsWith(".txt") && !defaultName.includes(".")) {
                defaultName += ".txt";
            }

            const chosenName = window.prompt("Save As - Enter filename:", defaultName);
            if (!chosenName) return;

            const safeName = chosenName.trim();
            titleInput.value = safeName;
            currentNoteId = "note-" + Date.now(); // create distinct copy

            // Save to localStorage
            handleSave();

            // Download file to PC as text file
            try {
                const blob = new Blob([textarea.value], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = safeName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast(`Saved and downloaded "${safeName}"`);
            } catch (e) {
                console.error("Save As download error", e);
            }
        }

        /* ------------------------------------------------------------
           Open Modal & Notes List
        ------------------------------------------------------------ */
        function openSavedModal() {
            renderSavedList();
            modalOverlay.classList.add("active");
        }

        function closeSavedModal() {
            modalOverlay.classList.remove("active");
        }

        function renderSavedList() {
            const savedNotes = getStoredNotes();
            savedList.innerHTML = "";

            if (!savedNotes || savedNotes.length === 0) {
                savedList.innerHTML = `<div class="notepad-empty-msg">No saved notes found.</div>`;
                return;
            }

            savedNotes.forEach(note => {
                const item = document.createElement("div");
                item.className = "notepad-saved-item";
                const dateFormatted = note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : "";

                item.innerHTML = `
                    <div>
                        <div class="notepad-saved-item-title">${escapeHtml(note.title || "Untitled Note")}</div>
                        <div class="notepad-saved-item-meta">${note.content ? note.content.slice(0, 35) + "..." : "Empty"} • ${dateFormatted}</div>
                    </div>
                    <button type="button" class="notepad-btn" style="padding: 4px 8px; font-size: 11px;">Open</button>
                `;

                item.addEventListener("click", () => {
                    titleInput.value = note.title;
                    textarea.value = note.content;
                    currentNoteId = note.id;
                    updateStats();
                    setModifiedState(false);
                    closeSavedModal();
                    showToast(`Opened "${note.title}"`);
                });

                savedList.appendChild(item);
            });
        }

        /* ------------------------------------------------------------
           Open from PC File Picker
        ------------------------------------------------------------ */
        function handleImportFromFile(file) {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                titleInput.value = file.name;
                textarea.value = text;
                currentNoteId = "note-" + Date.now();
                updateStats();
                setModifiedState(false);
                closeSavedModal();
                showToast(`Opened "${file.name}" from PC`);
            };
            reader.readAsText(file);
        }

        /* ------------------------------------------------------------
           Event Listeners
        ------------------------------------------------------------ */
        textarea.addEventListener("input", () => {
            updateStats();
            setModifiedState(true);
        });

        textarea.addEventListener("click", updateStats);
        textarea.addEventListener("keyup", updateStats);

        // Tab key indentation support in textarea
        textarea.addEventListener("keydown", (e) => {
            if (e.key === "Tab") {
                e.preventDefault();
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                textarea.value = textarea.value.substring(0, start) + "    " + textarea.value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 4;
                updateStats();
                setModifiedState(true);
            }
        });

        titleInput.addEventListener("input", () => {
            setModifiedState(true);
        });

        btnNew.addEventListener("click", handleNew);
        btnSave.addEventListener("click", handleSave);
        btnSaveAs.addEventListener("click", handleSaveAs);
        btnOpen.addEventListener("click", openSavedModal);
        modalClose.addEventListener("click", closeSavedModal);

        modalOverlay.addEventListener("click", (e) => {
            if (e.target === modalOverlay) closeSavedModal();
        });

        btnImportPC.addEventListener("click", () => {
            fileInput.click();
        });

        fileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                handleImportFromFile(e.target.files[0]);
            }
            fileInput.value = "";
        });

        // Keyboard Shortcuts within Notepad window
        rootElement.addEventListener("keydown", (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === "s" || e.key === "S") {
                    e.preventDefault();
                    if (e.shiftKey) {
                        handleSaveAs();
                    } else {
                        handleSave();
                    }
                } else if (e.key === "n" || e.key === "N") {
                    e.preventDefault();
                    handleNew();
                } else if (e.key === "o" || e.key === "O") {
                    e.preventDefault();
                    openSavedModal();
                }
            }
        });
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
       Register Applications with Nexus App Manager
    ---------------------------------------------------------------- */
    const appConfig = {
        id: APP_ID,
        title: "Notepad",
        width: 780,
        height: 520,
        content: () => getNotepadHTML()
    };

    CoreApp.registerApplication(appConfig);

    // Register alias 'notepad' so openApplication('notepad') and openApplication('notes') both work!
    CoreApp.registerApplication({
        ...appConfig,
        id: APP_ALIAS
    });

    /* ----------------------------------------------------------------
       Window Creation Hook
    ---------------------------------------------------------------- */
    document.addEventListener("nexus:window:created", (event) => {
        const win = event.detail;
        if (!win || (win.appId !== APP_ID && win.appId !== APP_ALIAS)) return;
        const notepadRoot = win.element.querySelector("#nexus-notepad-app");
        if (notepadRoot) {
            initNotepadInstance(notepadRoot);
        }
    });

    window.NexusNotepad = {
        open() {
            window.Nexus?.openApplication(APP_ID);
        }
    };

    console.log("Nexus Notepad Module loaded.");
})();
