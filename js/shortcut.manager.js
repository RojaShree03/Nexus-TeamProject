/* ================================================================
   NEXUS SHORTCUT MANAGER
   Module 1 - Core System

   Responsibilities:
   - Manage global keyboard shortcuts
   - Handle launcher shortcuts
   - Handle desktop search shortcut
   - Prevent shortcuts while typing
   - Provide shortcut registration/removal
================================================================ */


/* ================================================================
   NEXUS SHORTCUT MANAGER CLASS
================================================================ */

class NexusShortcutManager {

    constructor(options = {}) {

        /* --------------------------------------------------------
           Dependencies
        -------------------------------------------------------- */

        this.launcher =
            options.launcher ||
            null;

        this.searchInput =
            options.searchInput ||
            null;


        /* --------------------------------------------------------
           State
        -------------------------------------------------------- */

        this.enabled = true;

        this.initialized = false;


        /* --------------------------------------------------------
           Registered Custom Shortcuts
        -------------------------------------------------------- */

        this.shortcuts = new Map();


        /* --------------------------------------------------------
           Bound Handler
        -------------------------------------------------------- */

        this.boundKeyDown =
            this.handleKeyDown.bind(this);


        console.log(
            "Nexus Shortcut Manager created."
        );
    }


    /* ============================================================
       INITIALIZE
    ============================================================ */

    init() {

        if (this.initialized) {

            return true;
        }


        this.resolveElements();


        document.addEventListener(
            "keydown",
            this.boundKeyDown
        );


        this.initialized = true;


        console.log(
            "Nexus Shortcut Manager initialized."
        );


        return true;
    }


    /* ============================================================
       RESOLVE DOM ELEMENTS
    ============================================================ */

    resolveElements() {

        this.launcher =
            this.launcher ||
            document.getElementById(
                "application-launcher"
            );


        this.searchInput =
            this.searchInput ||
            document.getElementById(
                "desktop-search"
            );
    }


    /* ============================================================
       KEYBOARD HANDLER
    ============================================================ */

    handleKeyDown(event) {

        if (!this.enabled) {

            return;
        }


        if (!event) {

            return;
        }


        /* --------------------------------------------------------
           Custom shortcuts first
        -------------------------------------------------------- */

        if (
            this.handleRegisteredShortcut(
                event
            )
        ) {

            return;
        }


        /* --------------------------------------------------------
           Escape
        -------------------------------------------------------- */

        if (event.key === "Escape") {

            const launcher =
                document.getElementById(
                    "application-launcher"
                );

            if (
                launcher &&
                launcher.classList.contains("active")
            ) {

                event.preventDefault();

                this.closeLauncher();

                return;
            }
        }


        /* --------------------------------------------------------
           Desktop Search
        -------------------------------------------------------- */

        if (
            event.key === "/" &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.metaKey &&
            !event.shiftKey
        ) {

            if (
                this.isTyping(
                    event.target
                )
            ) {

                return;
            }


            this.handleSearchShortcut(
                event
            );
        }
    }


    /* ============================================================
       ESCAPE SHORTCUT
    ============================================================ */

    handleEscape(event) {

        const launcher =
            this.getLauncher();


        /*
         * Only prevent default if the launcher
         * is actually open.
         */

        if (
            launcher &&
            launcher.classList.contains(
                "active"
            )
        ) {

            event.preventDefault();


            this.closeLauncher();


            this.emit(
                "shortcut:escape",
                {
                    action: "close-launcher"
                }
            );
        }
    }


    /* ============================================================
       SEARCH SHORTCUT
    ============================================================ */

    handleSearchShortcut(event) {

        event.preventDefault();


        const search =
            this.getSearchInput();


        if (!search) {

            return;
        }


        search.focus();


        /*
         * Select the current search text so the
         * user can immediately type a new query.
         */

        if (
            typeof search.select ===
            "function"
        ) {

            search.select();
        }


        this.emit(
            "shortcut:search",
            {
                key: "/"
            }
        );
    }


    /* ============================================================
       CHECK WHETHER USER IS TYPING
    ============================================================ */

    isTyping(element) {

        if (!element) {

            return false;
        }


        const tagName =
            element.tagName?.toLowerCase();


        return (

            tagName === "input" ||

            tagName === "textarea" ||

            tagName === "select" ||

            element.isContentEditable === true

        );
    }


    /* ============================================================
       GET LAUNCHER
    ============================================================ */

    getLauncher() {

        this.launcher =
            this.launcher ||
            document.getElementById(
                "application-launcher"
            );


        return this.launcher;
    }


    /* ============================================================
       GET SEARCH INPUT
    ============================================================ */

    getSearchInput() {

        this.searchInput =
            this.searchInput ||
            document.getElementById(
                "desktop-search"
            );


        return this.searchInput;
    }


    /* ============================================================
       OPEN LAUNCHER
    ============================================================ */

    openLauncher() {

        const launcher =
            this.getLauncher();


        if (!launcher) {

            return false;
        }


        launcher.classList.add(
            "active"
        );


        launcher.setAttribute(
            "aria-hidden",
            "false"
        );


        const search =
            launcher.querySelector(
                "#launcher-search-input"
            );


        if (search) {

            search.value = "";


            setTimeout(() => {

                search.focus();

            }, 100);
        }


        this.emit(
            "launcher:open"
        );


        return true;
    }


    /* ============================================================
       CLOSE LAUNCHER
    ============================================================ */

    closeLauncher() {

        const launcher =
            this.getLauncher();


        if (!launcher) {

            return false;
        }


        launcher.classList.remove(
            "active"
        );


        launcher.setAttribute(
            "aria-hidden",
            "true"
        );


        this.emit(
            "launcher:close"
        );


        return true;
    }


    /* ============================================================
       TOGGLE LAUNCHER
    ============================================================ */

    toggleLauncher() {

        const launcher =
            this.getLauncher();


        if (!launcher) {

            return false;
        }


        if (
            launcher.classList.contains(
                "active"
            )
        ) {

            return this.closeLauncher();
        }


        return this.openLauncher();
    }


    /* ============================================================
       REGISTER CUSTOM SHORTCUT
    ============================================================ */

    registerShortcut(
        key,
        callback,
        options = {}
    ) {

        if (!key) {

            return false;
        }


        if (
            typeof callback !==
            "function"
        ) {

            return false;
        }


        const normalizedKey =
            this.normalizeKey(key);


        if (!normalizedKey) {

            return false;
        }


        const shortcut = {

            key:
                normalizedKey,

            callback:
                callback,

            ctrl:
                Boolean(options.ctrl),

            shift:
                Boolean(options.shift),

            alt:
                Boolean(options.alt),

            meta:
                Boolean(options.meta),

            allowWhileTyping:
                Boolean(
                    options.allowWhileTyping
                )

        };


        const shortcutId =
            this.createShortcutId(
                shortcut
            );


        this.shortcuts.set(
            shortcutId,
            shortcut
        );


        return shortcutId;
    }


    /* ============================================================
       REMOVE SHORTCUT
    ============================================================ */

    unregisterShortcut(
        shortcutId
    ) {

        if (!shortcutId) {

            return false;
        }


        return this.shortcuts.delete(
            shortcutId
        );
    }


    /* ============================================================
       CLEAR CUSTOM SHORTCUTS
    ============================================================ */

    clearShortcuts() {

        this.shortcuts.clear();

        return true;
    }


    /* ============================================================
       HANDLE REGISTERED SHORTCUT
    ============================================================ */

    handleRegisteredShortcut(event) {

        if (
            this.shortcuts.size === 0
        ) {

            return false;
        }


        for (
            const [
                shortcutId,
                shortcut
            ]
            of this.shortcuts
        ) {

            if (
                !this.matchesShortcut(
                    event,
                    shortcut
                )
            ) {

                continue;
            }


            if (
                !shortcut.allowWhileTyping &&
                this.isTyping(
                    event.target
                )
            ) {

                return false;
            }


            event.preventDefault();


            try {

                shortcut.callback(
                    event
                );

            } catch (error) {

                console.error(
                    `Nexus Shortcut "${shortcutId}" failed:`,
                    error
                );
            }


            this.emit(
                "shortcut:triggered",
                {
                    shortcut:
                        shortcutId
                }
            );


            return true;
        }


        return false;
    }


    /* ============================================================
       MATCH SHORTCUT
    ============================================================ */

    matchesShortcut(
        event,
        shortcut
    ) {

        return (

            this.normalizeKey(
                event.key
            ) === shortcut.key &&

            Boolean(event.ctrlKey) ===
            shortcut.ctrl &&

            Boolean(event.shiftKey) ===
            shortcut.shift &&

            Boolean(event.altKey) ===
            shortcut.alt &&

            Boolean(event.metaKey) ===
            shortcut.meta

        );
    }


    /* ============================================================
       NORMALIZE KEY
    ============================================================ */

    normalizeKey(key) {

        if (!key) {

            return "";
        }


        return String(key)
            .trim()
            .toLowerCase();
    }


    /* ============================================================
       CREATE SHORTCUT ID
    ============================================================ */

    createShortcutId(
        shortcut
    ) {

        return [

            shortcut.ctrl
                ? "ctrl"
                : "",

            shortcut.shift
                ? "shift"
                : "",

            shortcut.alt
                ? "alt"
                : "",

            shortcut.meta
                ? "meta"
                : "",

            shortcut.key

        ]
            .filter(Boolean)
            .join("+");
    }


    /* ============================================================
       ENABLE
    ============================================================ */

    enable() {

        this.enabled = true;

        return true;
    }


    /* ============================================================
       DISABLE
    ============================================================ */

    disable() {

        this.enabled = false;

        return true;
    }


    /* ============================================================
       IS ENABLED
    ============================================================ */

    isEnabled() {

        return this.enabled;
    }


    /* ============================================================
       EVENT EMITTER
    ============================================================ */

    emit(
        eventName,
        detail = {}
    ) {

        document.dispatchEvent(

            new CustomEvent(
                `nexus:${eventName}`,
                {
                    detail: detail
                }
            )

        );
    }


    /* ============================================================
       DESTROY
    ============================================================ */

    destroy() {

        if (this.initialized) {

            document.removeEventListener(
                "keydown",
                this.boundKeyDown
            );
        }


        this.shortcuts.clear();


        this.initialized = false;

        this.enabled = false;

        this.launcher = null;

        this.searchInput = null;


        console.log(
            "Nexus Shortcut Manager destroyed."
        );
    }
}


/* ================================================================
   GLOBAL EXPORT
================================================================ */

window.NexusShortcutManager =
    NexusShortcutManager;


/* ================================================================
   GLOBAL INSTANCE
================================================================ */

window.nexusShortcutManager =
    new NexusShortcutManager();