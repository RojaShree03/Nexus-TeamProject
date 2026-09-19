/* ================================================================
   NEXUS STATE MANAGER
   Module 1 - Core System

   Responsibilities:
   - Maintain central Nexus state
   - Manage current screen
   - Manage user state
   - Manage authentication state
   - Manage system settings
   - Load state from localStorage
   - Save state to localStorage
   - Reset state
================================================================ */


/* ================================================================
   NEXUS STATE MANAGER CLASS
================================================================ */

class NexusStateManager {

    constructor() {

        /* --------------------------------------------------------
           Storage Keys
        -------------------------------------------------------- */

        this.USER_STORAGE_KEY = "nexusUser";
        this.SETTINGS_STORAGE_KEY = "nexusSettings";


        /* --------------------------------------------------------
           Default Settings
        -------------------------------------------------------- */

        this.defaultSettings = {
            theme: "dark",
            wallpaper: null,
            accentColor: "#ff9f43"
        };


        /* --------------------------------------------------------
           Central Nexus State
        -------------------------------------------------------- */

        this.state = {

            booted: false,

            systemReady: false,

            currentScreen: "boot-screen",

            user: null,

            isAuthenticated: false,

            settings: {
                ...this.defaultSettings
            }

        };


        console.log(
            "Nexus State Manager created."
        );
    }


    /* ============================================================
       INITIALIZE
    ============================================================ */

    init() {

        this.loadUser();

        this.loadSettings();

        console.log(
            "Nexus State Manager initialized."
        );

        return this.state;
    }


    /* ============================================================
       GET COMPLETE STATE
    ============================================================ */

    getState() {

        return this.state;
    }


    /* ============================================================
       BOOT STATE
    ============================================================ */

    setBooted(value) {

        this.state.booted = Boolean(value);

        return this.state.booted;
    }


    isBooted() {

        return this.state.booted;
    }


    /* ============================================================
       SYSTEM READY
    ============================================================ */

    setSystemReady(value) {

        this.state.systemReady = Boolean(value);

        return this.state.systemReady;
    }


    isSystemReady() {

        return this.state.systemReady;
    }


    /* ============================================================
       CURRENT SCREEN
    ============================================================ */

    setCurrentScreen(screenName) {

        if (!screenName) {
            return false;
        }

        this.state.currentScreen = screenName;

        return true;
    }


    getCurrentScreen() {

        return this.state.currentScreen;
    }


    /* ============================================================
       USER
    ============================================================ */

    setUser(user) {

        this.state.user = user || null;

        return this.state.user;
    }


    getUser() {

        return this.state.user;
    }


    hasUser() {

        return this.state.user !== null;
    }


    /* ============================================================
       USER STORAGE
    ============================================================ */

    loadUser() {

        try {

            const storedUser =
                localStorage.getItem(
                    this.USER_STORAGE_KEY
                );


            if (!storedUser) {

                this.state.user = null;

                return null;
            }


            const user =
                JSON.parse(storedUser);


            this.state.user = user || null;

            return this.state.user;

        } catch (error) {

            console.error(
                "Nexus State Manager: Failed to load user.",
                error
            );

            this.state.user = null;

            return null;
        }
    }


    saveUser(user = this.state.user) {

        try {

            if (!user) {

                localStorage.removeItem(
                    this.USER_STORAGE_KEY
                );

                this.state.user = null;

                return false;
            }


            localStorage.setItem(
                this.USER_STORAGE_KEY,
                JSON.stringify(user)
            );


            this.state.user = user;

            return true;

        } catch (error) {

            console.error(
                "Nexus State Manager: Failed to save user.",
                error
            );

            return false;
        }
    }


    removeUser() {

        try {

            localStorage.removeItem(
                this.USER_STORAGE_KEY
            );

        } catch (error) {

            console.error(
                "Nexus State Manager: Failed to remove user.",
                error
            );

            return false;
        }


        this.state.user = null;

        this.state.isAuthenticated = false;

        return true;
    }


    /* ============================================================
       AUTHENTICATION STATE
    ============================================================ */

    setAuthenticated(value) {

        this.state.isAuthenticated =
            Boolean(value);

        return this.state.isAuthenticated;
    }


    isAuthenticated() {

        return this.state.isAuthenticated;
    }


    login(user = null) {

        if (user) {

            this.state.user = user;
        }


        if (!this.state.user) {

            return false;
        }


        this.state.isAuthenticated = true;

        return true;
    }


    logout() {

        this.state.isAuthenticated = false;

        return true;
    }


    /* ============================================================
       SETTINGS
    ============================================================ */

    getSettings() {

        return this.state.settings;
    }


    setSettings(settings = {}) {

        this.state.settings = {

            ...this.defaultSettings,

            ...settings

        };


        return this.state.settings;
    }


    updateSetting(key, value) {

        if (!key) {
            return false;
        }


        this.state.settings[key] = value;

        return true;
    }


    getSetting(key) {

        if (!key) {
            return null;
        }


        return this.state.settings[key] ?? null;
    }


    /* ============================================================
       SETTINGS STORAGE
    ============================================================ */

    loadSettings() {

        try {

            const storedSettings =
                localStorage.getItem(
                    this.SETTINGS_STORAGE_KEY
                );


            if (!storedSettings) {

                this.state.settings = {
                    ...this.defaultSettings
                };

                return this.state.settings;
            }


            const settings =
                JSON.parse(storedSettings);


            this.state.settings = {

                ...this.defaultSettings,

                ...(settings || {})

            };


            return this.state.settings;

        } catch (error) {

            console.error(
                "Nexus State Manager: Failed to load settings.",
                error
            );


            this.state.settings = {
                ...this.defaultSettings
            };


            return this.state.settings;
        }
    }


    saveSettings(settings = this.state.settings) {

        try {

            this.state.settings = {

                ...this.defaultSettings,

                ...(settings || {})

            };


            localStorage.setItem(
                this.SETTINGS_STORAGE_KEY,
                JSON.stringify(
                    this.state.settings
                )
            );


            return true;

        } catch (error) {

            console.error(
                "Nexus State Manager: Failed to save settings.",
                error
            );

            return false;
        }
    }


    /* ============================================================
       RESET STATE
    ============================================================ */

    resetState() {

        this.state = {

            booted: false,

            systemReady: false,

            currentScreen: "boot-screen",

            user: null,

            isAuthenticated: false,

            settings: {
                ...this.defaultSettings
            }

        };


        return this.state;
    }


    /* ============================================================
       RESET EVERYTHING
    ============================================================ */

    resetAll() {

        try {

            localStorage.removeItem(
                this.USER_STORAGE_KEY
            );

            localStorage.removeItem(
                this.SETTINGS_STORAGE_KEY
            );

        } catch (error) {

            console.error(
                "Nexus State Manager: Failed to clear storage.",
                error
            );

            return false;
        }


        this.resetState();

        return true;
    }


    /* ============================================================
       DEBUG INFORMATION
    ============================================================ */

    getDebugState() {

        return {

            booted:
                this.state.booted,

            systemReady:
                this.state.systemReady,

            currentScreen:
                this.state.currentScreen,

            hasUser:
                this.hasUser(),

            isAuthenticated:
                this.state.isAuthenticated,

            settings:
                {
                    ...this.state.settings
                }

        };
    }

}


/* ================================================================
   GLOBAL EXPORT
================================================================ */

window.NexusStateManager =
    NexusStateManager;


/* ================================================================
   GLOBAL INSTANCE
================================================================ */

window.nexusStateManager =
    new NexusStateManager();