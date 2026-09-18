/* ================================================================
   NEXUS APPLICATION MANAGER
   Module 1 - Core System

   Responsibilities:
   - Register Nexus applications
   - Store application configuration
   - Find applications
   - Search applications
   - Check application availability
   - Launch applications through Window Manager
   - Manage application metadata
================================================================ */


/* ================================================================
   NEXUS APPLICATION MANAGER CLASS
================================================================ */

class NexusAppManager {

    constructor(options = {}) {

        /* --------------------------------------------------------
           Dependencies
        -------------------------------------------------------- */

        this.stateManager =
            options.stateManager ||
            window.nexusStateManager ||
            null;

        this.windowManager =
            options.windowManager ||
            null;


        /* --------------------------------------------------------
           Application Registry
        -------------------------------------------------------- */

        this.applications = new Map();


        /* --------------------------------------------------------
           Initialize Built-in Applications
        -------------------------------------------------------- */

        this.registerDefaultApplications();


        console.log(
            "Nexus Application Manager created."
        );
    }


    /* ============================================================
       INITIALIZE
    ============================================================ */

    init(options = {}) {

        if (options.stateManager) {

            this.stateManager =
                options.stateManager;
        }


        if (options.windowManager) {

            this.windowManager =
                options.windowManager;
        }


        /*
         * Try to use the globally available
         * Window Manager if one exists.
         */

        this.windowManager =
            this.windowManager ||
            window.nexusWindowManager ||
            null;


        console.log(
            "Nexus Application Manager initialized."
        );


        return true;
    }


    /* ============================================================
       REGISTER DEFAULT APPLICATIONS
    ============================================================ */

    registerDefaultApplications() {

        this.applications.clear();


        /* --------------------------------------------------------
           FILES
        -------------------------------------------------------- */

        this.registerApplication({

            id: "files",

            title: "Files",

            width: 760,

            height: 500,

            content: `

                <div class="nexus-app-shell">

                    <div class="nexus-app-sidebar">

                        <div class="nexus-app-section-title">
                            Locations
                        </div>

                        <button class="nexus-app-nav active">
                            Home
                        </button>

                        <button class="nexus-app-nav">
                            Documents
                        </button>

                        <button class="nexus-app-nav">
                            Downloads
                        </button>

                        <button class="nexus-app-nav">
                            Projects
                        </button>

                    </div>


                    <div class="nexus-app-main">

                        <div class="nexus-app-toolbar">

                            <div>
                                <strong>Home</strong>
                            </div>

                        </div>


                        <div class="nexus-file-grid">

                            <div class="nexus-file-item">

                                <div class="nexus-file-icon">

                                    <svg width="28" height="28">
                                        <use href="#icon-files"></use>
                                    </svg>

                                </div>

                                <span>
                                    Documents
                                </span>

                            </div>


                            <div class="nexus-file-item">

                                <div class="nexus-file-icon">

                                    <svg width="28" height="28">
                                        <use href="#icon-files"></use>
                                    </svg>

                                </div>

                                <span>
                                    Downloads
                                </span>

                            </div>


                            <div class="nexus-file-item">

                                <div class="nexus-file-icon">

                                    <svg width="28" height="28">
                                        <use href="#icon-files"></use>
                                    </svg>

                                </div>

                                <span>
                                    Projects
                                </span>

                            </div>

                        </div>

                    </div>

                </div>

            `

        });


        /* --------------------------------------------------------
           PROJECTS
        -------------------------------------------------------- */

        this.registerApplication({

            id: "projects",

            title: "Projects",

            width: 760,

            height: 500,

            content: `

                <div class="nexus-app-basic">

                    <div class="nexus-app-basic-icon projects-icon">

                        <svg width="42" height="42">
                            <use href="#icon-projects"></use>
                        </svg>

                    </div>


                    <h2>
                        Projects
                    </h2>


                    <p>
                        Your Nexus projects will appear here.
                    </p>

                </div>

            `

        });


        /* --------------------------------------------------------
           BROWSER
        -------------------------------------------------------- */

        this.registerApplication({

            id: "browser",

            title: "Browser",

            width: 850,

            height: 560,

            content: `

                <div class="nexus-browser">

                    <div class="nexus-browser-toolbar">

                        <button>
                            ←
                        </button>

                        <button>
                            →
                        </button>

                        <button>
                            ↻
                        </button>


                        <div class="nexus-browser-address">
                            nexus://home
                        </div>

                    </div>


                    <div class="nexus-browser-page">

                        <div class="nexus-browser-logo browser-icon">

                            <svg width="48" height="48">
                                <use href="#icon-browser"></use>
                            </svg>

                        </div>


                        <h2>
                            Nexus Browser
                        </h2>


                        <p>
                            Browse the web from your Nexus workspace.
                        </p>

                    </div>

                </div>

            `

        });


        /* --------------------------------------------------------
           NOTES
        -------------------------------------------------------- */

        this.registerApplication({

            id: "notes",

            title: "Notes",

            width: 680,

            height: 480,

            content: `

                <div class="nexus-notes">

                    <div class="nexus-notes-sidebar">

                        <div class="nexus-app-section-title">
                            Notes
                        </div>


                        <button class="nexus-note-item active">
                            Welcome to Nexus
                        </button>

                    </div>


                    <div class="nexus-notes-editor">

                        <input
                            type="text"
                            value="Welcome to Nexus"
                            class="nexus-note-title"
                        >


                        <textarea
                            class="nexus-note-content"
                            placeholder="Start writing..."
                        ></textarea>

                    </div>

                </div>

            `

        });


        /* --------------------------------------------------------
           SETTINGS
        -------------------------------------------------------- */

        this.registerApplication({

            id: "settings",

            title: "Settings",

            width: 700,

            height: 500,

            /*
             * Settings needs the current user name.
             * Therefore content is generated dynamically.
             */

            content: () => {

                const user =
                    this.stateManager?.getUser();


                const userName =
                    user?.name ||
                    "User";


                return `

                    <div class="nexus-settings">

                        <div class="nexus-settings-sidebar">

                            <div class="nexus-app-section-title">
                                Settings
                            </div>


                            <button class="nexus-app-nav active">
                                General
                            </button>


                            <button class="nexus-app-nav">
                                Appearance
                            </button>


                            <button class="nexus-app-nav">
                                Profile
                            </button>


                            <button class="nexus-app-nav">
                                Storage
                            </button>

                        </div>


                        <div class="nexus-settings-content">

                            <h2>
                                General
                            </h2>


                            <p>
                                Manage your Nexus workspace.
                            </p>


                            <div class="nexus-setting-card">

                                <div>

                                    <strong>
                                        Nexus Account
                                    </strong>


                                    <span>
                                        ${this.escapeHtml(userName)}
                                    </span>

                                </div>

                            </div>


                            <div class="nexus-setting-card">

                                <div>

                                    <strong>
                                        Theme
                                    </strong>


                                    <span>
                                        Dark
                                    </span>

                                </div>

                            </div>

                        </div>

                    </div>

                `;
            }

        });


        /* --------------------------------------------------------
           TERMINAL
        -------------------------------------------------------- */

        this.registerApplication({

            id: "terminal",

            title: "Terminal",

            width: 720,

            height: 450,

            content: `

                <div class="nexus-terminal">

                    <div class="nexus-terminal-output">

                        <div>
                            Nexus Terminal [Core]
                        </div>


                        <div>
                            System ready.
                        </div>


                        <br>


                        <div>
                            Type <span>help</span> to begin.
                        </div>

                    </div>


                    <div class="nexus-terminal-input">

                        <span>
                            nexus@system:~$
                        </span>


                        <input
                            type="text"
                            autocomplete="off"
                            spellcheck="false"
                        >

                    </div>

                </div>

            `

        });


        /* --------------------------------------------------------
           TRASH
        -------------------------------------------------------- */

        this.registerApplication({

            id: "trash",

            title: "Trash",

            width: 620,

            height: 420,

            content: `

                <div class="nexus-app-basic">

                    <div class="nexus-app-basic-icon trash-icon">

                        <svg width="42" height="42">
                            <use href="#icon-trash"></use>
                        </svg>

                    </div>


                    <h2>
                        Trash is Empty
                    </h2>


                    <p>
                        Deleted files will appear here.
                    </p>

                </div>

            `

        });


        /* --------------------------------------------------------
           ABOUT NEXUS
        -------------------------------------------------------- */

        this.registerApplication({

            id: "about",

            title: "About Nexus",

            width: 520,

            height: 400,

            content: `

                <div class="nexus-about">

                    <img
                        src="./assets/logo/nexus-logo.png"
                        alt="Nexus"
                    >


                    <h2>
                        Nexus OS
                    </h2>


                    <p>
                        A browser-based operating
                        environment built with
                        HTML, CSS and JavaScript.
                    </p>


                    <span>
                        Nexus Core Module
                    </span>

                </div>

            `

        });
    }


    /* ============================================================
       REGISTER APPLICATION
    ============================================================ */

    registerApplication(config) {

        if (!config) {

            return false;
        }


        if (!config.id) {

            console.error(
                "Nexus App Manager: Application ID is required."
            );


            return false;
        }


        if (!config.title) {

            console.error(
                `Nexus App Manager: Application "${config.id}" has no title.`
            );


            return false;
        }


        const application = {

            id:
                config.id,

            title:
                config.title,

            width:
                config.width || 720,

            height:
                config.height || 480,

            content:
                config.content || "",

            metadata:
                config.metadata || {}

        };


        this.applications.set(
            application.id,
            application
        );


        return true;
    }


    /* ============================================================
       UNREGISTER APPLICATION
    ============================================================ */

    unregisterApplication(appId) {

        if (!appId) {

            return false;
        }


        return this.applications.delete(
            appId
        );
    }


    /* ============================================================
       GET APPLICATION
    ============================================================ */

    getApplication(appId) {

        if (!appId) {

            return null;
        }


        return (
            this.applications.get(
                appId
            ) || null
        );
    }


    /* ============================================================
       GET APPLICATION CONFIG
       Compatibility method for old Nexus Core code.
    ============================================================ */

    getApplicationConfig(appId) {

        return this.getApplication(
            appId
        );
    }


    /* ============================================================
       CHECK APPLICATION
    ============================================================ */

    hasApplication(appId) {

        return this.applications.has(
            appId
        );
    }


    /* ============================================================
       GET ALL APPLICATIONS
    ============================================================ */

    getAllApplications() {

        return Array.from(
            this.applications.values()
        );
    }


    /* ============================================================
       GET APPLICATION IDS
    ============================================================ */

    getApplicationIds() {

        return Array.from(
            this.applications.keys()
        );
    }


    /* ============================================================
       SEARCH APPLICATIONS
    ============================================================ */

    searchApplications(query = "") {

        const searchQuery =
            String(query)
                .trim()
                .toLowerCase();


        if (!searchQuery) {

            return this.getAllApplications();
        }


        return this.getAllApplications()
            .filter((application) => {

                return (

                    application.id
                        .toLowerCase()
                        .includes(searchQuery)

                    ||

                    application.title
                        .toLowerCase()
                        .includes(searchQuery)

                );

            });
    }


    /* ============================================================
       GET APPLICATION CONTENT
    ============================================================ */

    getApplicationContent(appId) {

        const application =
            this.getApplication(appId);


        if (!application) {

            return null;
        }


        /*
         * Some applications such as Settings
         * generate their content dynamically.
         */

        if (
            typeof application.content ===
            "function"
        ) {

            return application.content();
        }


        return application.content;
    }


    /* ============================================================
       LAUNCH APPLICATION
    ============================================================ */

    launchApplication(
        appId,
        windowManager = null
    ) {

        const application =
            this.getApplication(appId);


        if (!application) {

            console.warn(
                "Unknown Nexus application:",
                appId
            );


            return null;
        }


        const manager =
            windowManager ||
            this.windowManager ||
            window.nexusWindowManager;


        if (!manager) {

            console.error(
                "Nexus App Manager: Window Manager unavailable."
            );


            return null;
        }


        const content =
            this.getApplicationContent(
                appId
            );


        const windowState =
            manager.createWindow({

                appId:
                    application.id,

                title:
                    application.title,

                width:
                    application.width,

                height:
                    application.height,

                singleInstance:
                    true,

                content:
                    content

            });


        if (!windowState) {

            return null;
        }


        console.log(
            `${application.title} window created.`
        );


        return windowState;
    }


    /* ============================================================
       OPEN APPLICATION
       Alias for launchApplication()
    ============================================================ */

    openApplication(
        appId,
        windowManager = null
    ) {

        return this.launchApplication(
            appId,
            windowManager
        );
    }


    /* ============================================================
       APPLICATION COUNT
    ============================================================ */

    getApplicationCount() {

        return this.applications.size;
    }


    /* ============================================================
       ESCAPE HTML
    ============================================================ */

    escapeHtml(value) {

        const div =
            document.createElement(
                "div"
            );


        div.textContent =
            value ?? "";


        return div.innerHTML;
    }


    /* ============================================================
       RESET REGISTRY
    ============================================================ */

    reset() {

        this.registerDefaultApplications();

        return true;
    }


    /* ============================================================
       DEBUG INFORMATION
    ============================================================ */

    getDebugInfo() {

        return {

            count:
                this.getApplicationCount(),

            applications:
                this.getApplicationIds()

        };
    }

}


/* ================================================================
   GLOBAL EXPORT
================================================================ */

window.NexusAppManager =
    NexusAppManager;


/* ================================================================
   GLOBAL INSTANCE
================================================================ */

window.nexusAppManager =
    new NexusAppManager({
        stateManager:
            window.nexusStateManager
    });