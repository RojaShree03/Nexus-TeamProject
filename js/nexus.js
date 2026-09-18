/* ================================================================
   NEXUS CORE CONTROLLER
   Module 1 — Core System
================================================================ */


/* ================================================================
   NEXUS CORE
================================================================ */

const Nexus = {


    /* ============================================================
       MANAGERS
    ============================================================ */

    stateManager: null,

    bootManager: null,

    authManager: null,

    appManager: null,

    shortcutManager: null,

    eventManager: null,

    windowManager: null,


    /* ============================================================
       STATE COMPATIBILITY
    ============================================================ */

    state: null,


    /* ============================================================
       INTERNAL
    ============================================================ */

    clockInterval: null,

    eventsBound: false,

    desktopEventsBound: false,

    desktopIconEventBound: false,


    /* ============================================================
       INITIALIZE
    ============================================================ */

    init() {

        console.log(
            "Nexus starting..."
        );


        /* --------------------------------------------------------
           STATE MANAGER
        -------------------------------------------------------- */

        this.stateManager =
            window.nexusStateManager;


        if (!this.stateManager) {

            console.error(
                "Nexus Error: State Manager not loaded."
            );

            return;

        }


        this.stateManager.init();


        this.state =
            this.stateManager.getState();


        /* --------------------------------------------------------
           BOOT MANAGER
        -------------------------------------------------------- */

        this.bootManager =
            window.nexusBootManager;


        if (!this.bootManager) {

            console.error(
                "Nexus Error: Boot Manager not loaded."
            );

            return;

        }


        this.bootManager.init();


        /* --------------------------------------------------------
           AUTH MANAGER
        -------------------------------------------------------- */

        this.authManager =
            window.nexusAuthManager;


        if (!this.authManager) {

            console.error(
                "Nexus Error: Auth Manager not loaded."
            );

            return;

        }


        this.authManager.init();


        /* --------------------------------------------------------
           WINDOW MANAGER
        -------------------------------------------------------- */

        this.initializeWindowManager();


        /* --------------------------------------------------------
           APP MANAGER
        -------------------------------------------------------- */

        this.appManager =
            window.nexusAppManager;


        if (!this.appManager) {

            console.error(
                "Nexus Error: App Manager not loaded."
            );

            return;

        }


        /*
         * Make sure App Manager uses the
         * current State Manager and Window Manager.
         */

        this.appManager.stateManager =
            this.stateManager;

        this.appManager.windowManager =
            this.windowManager;


        this.appManager.init();


        /* --------------------------------------------------------
           SHORTCUT MANAGER
        -------------------------------------------------------- */

        this.shortcutManager =
            window.nexusShortcutManager || null;


        if (this.shortcutManager) {

            this.shortcutManager.init();

            console.log("Nexus Shortcut Manager Connected.")

        }
        else {

            console.warn(
                "Nexus Warning: Shortcut Manager not loaded."
            );

        }


        /* --------------------------------------------------------
           EVENT MANAGER
        -------------------------------------------------------- */

        this.eventManager =
            window.nexusEventManager;


        if (!this.eventManager) {

            console.warn(
                "Nexus Warning: Event Manager not initialized yet."
            );

        }


        /* --------------------------------------------------------
           GLOBAL EVENTS
        -------------------------------------------------------- */

        this.bindEvents();


        /* --------------------------------------------------------
           START BOOT
        -------------------------------------------------------- */

        this.boot();


        console.log(
            "Nexus Core initialized successfully."
        );

    },


    /* ============================================================
       WINDOW MANAGER
    ============================================================ */

    initializeWindowManager() {

        if (
            typeof NexusWindowManager ===
            "undefined"
        ) {

            console.error(
                "Nexus Error: Window Manager not loaded."
            );

            return;

        }


        const windowLayer =
            document.getElementById(
                "window-layer"
            );


        if (!windowLayer) {

            console.error(
                "Nexus Error: #window-layer not found."
            );

            return;

        }


        /*
         * Do not create another Window Manager
         * if one already exists.
         */

        if (this.windowManager) {

            return;

        }


        this.windowManager =
            new NexusWindowManager({

                container:
                    windowLayer,

                minWidth:
                    320,

                minHeight:
                    220,

                defaultWidth:
                    720,

                defaultHeight:
                    480

            });


        console.log(
            "Nexus Window Manager connected."
        );

    },


    /* ============================================================
       BOOT
    ============================================================ */

    boot() {

        if (!this.bootManager) {

            console.error(
                "Nexus Error: Boot Manager unavailable."
            );

            return;

        }


        this.bootManager.start(() => {

            this.finishBoot();

        });

    },


    /* ============================================================
       FINISH BOOT
    ============================================================ */

    finishBoot() {

        if (!this.stateManager) {
            return;
        }


        this.stateManager.setBooted(
            true
        );


        this.stateManager.setSystemReady(
            true
        );


        this.state =
            this.stateManager.getState();


        console.log(
            "Nexus boot completed."
        );


        /*
         * Existing user
         *      ↓
         * Login
         *
         * No user
         *      ↓
         * Setup
         */

        if (
            this.authManager &&
            this.authManager.hasUser()
        ) {

            this.authManager.loadUser();

            this.showLogin();

        }
        else {

            this.showSetup();

        }

    },


    /* ============================================================
       USER
    ============================================================ */

    hasUser() {

        if (!this.authManager) {
            return false;
        }


        return this.authManager.hasUser();

    },


    loadUser() {

        if (!this.authManager) {
            return null;
        }


        const user =
            this.authManager.loadUser();


        this.state =
            this.stateManager.getState();


        return user;

    },


    saveUser(user) {

        if (
            !this.authManager ||
            !user
        ) {

            return false;

        }


        const result =
            this.authManager.saveUser(
                user
            );


        this.state =
            this.stateManager.getState();


        return result;

    },


    createUser(
        name,
        password,
        avatar
    ) {

        if (!this.authManager) {
            return null;
        }


        const user =
            this.authManager.createUser(
                name,
                password,
                avatar
            );


        this.state =
            this.stateManager.getState();


        return user;

    },


    /* ============================================================
       SETTINGS
    ============================================================ */

    loadSettings() {

        if (!this.stateManager) {
            return null;
        }


        return this.stateManager.loadSettings();

    },


    saveSettings() {

        if (!this.stateManager) {
            return false;
        }


        return this.stateManager.saveSettings();

    },


    /* ============================================================
       SETUP SCREEN
    ============================================================ */

    showSetup() {

        this.switchScreen(
            "setup-screen"
        );


        const name =
            document.getElementById(
                "setup-name"
            );


        const password =
            document.getElementById(
                "setup-password"
            );


        const confirmPassword =
            document.getElementById(
                "setup-confirm-password"
            );


        const error =
            document.getElementById(
                "setup-error"
            );


        if (name) {

            name.value = "";

        }


        if (password) {

            password.value = "";

        }


        if (confirmPassword) {

            confirmPassword.value = "";

        }


        if (error) {

            error.textContent = "";

        }

    },


    /* ============================================================
       HANDLE SETUP
    ============================================================ */

    handleSetup() {

    if (!this.authManager) {
        console.error(
            "Nexus Error: Auth Manager unavailable."
        );
        return;
    }

    const result =
        this.authManager.handleSetup();

    if (
        !result ||
        !result.success
    ) {
        return;
    }

    this.stateManager.setAuthenticated(true);

    this.state =
        this.stateManager.getState();

    this.updateDesktopAvatar();

    this.showDesktop();
},


    /* ============================================================
       LOGIN SCREEN
    ============================================================ */

    showLogin() {

        if (!this.authManager) {

            return;

        }


        const user =
            this.authManager.loadUser();


        if (!user) {

            this.showSetup();

            return;

        }


        const name =
            document.getElementById(
                "login-name"
            );


        const avatar =
            document.getElementById(
                "login-avatar"
            );


        const password =
            document.getElementById(
                "login-password"
            );


        const error =
            document.getElementById(
                "login-error"
            );


        if (name) {

            name.textContent =
                user.name || "User";

        }


        this.setAvatar(
            avatar,
            user.avatar,
            user.name
        );


        if (password) {

            password.value = "";

        }


        if (error) {

            error.textContent = "";

        }


        /*
         * User exists but has not
         * authenticated for this session.
         */

        this.stateManager.setAuthenticated(
            false
        );


        this.state =
            this.stateManager.getState();


        this.switchScreen(
            "login-screen"
        );


        setTimeout(() => {

            if (password) {

                password.focus();

            }

        }, 150);

    },


    /* ============================================================
       LOGIN
    ============================================================ */

    login(password) {

        if (!this.authManager) {

            return false;

        }


        return this.authManager.login(
            password
        );

    },


    /* ============================================================
       HANDLE LOGIN
    ============================================================ */

    handleLogin() {

    if (!this.authManager) {

        console.error(
            "Nexus Error: Auth Manager unavailable."
        );

        return;
    }


    const passwordElement =
        document.getElementById(
            "login-password"
        );

    const error =
        document.getElementById(
            "login-error"
        );


    if (
        !passwordElement ||
        !error
    ) {

        return;
    }


    const password =
        passwordElement.value;


    error.textContent = "";


    /* --------------------------------------------------------
       Empty password
    -------------------------------------------------------- */

    if (!password) {

        error.textContent =
            "Please enter your password.";

        passwordElement.focus();

        return;
    }


    /* --------------------------------------------------------
       Auth Manager performs login
    -------------------------------------------------------- */

    const result =
        this.authManager.login(
            password
        );


    /* --------------------------------------------------------
       IMPORTANT:
       Auth Manager returns an object:
       
       {
           success: true/false,
           message: "..."
       }
    -------------------------------------------------------- */

    if (
        !result ||
        result.success !== true
    ) {

        error.textContent =
            result?.message ||
            "Incorrect password.";

        passwordElement.select();

        return;
    }


    /* --------------------------------------------------------
       Login successful
    -------------------------------------------------------- */

    this.stateManager.setAuthenticated(
        true
    );


    this.state =
        this.stateManager.getState();


    passwordElement.value = "";


    this.showDesktop();
},


    /* ============================================================
       LOGOUT
    ============================================================ */

    logout() {

        if (this.windowManager) {

            this.windowManager.closeAll();

        }


        if (this.authManager) {

            this.authManager.logout();

        }
        else {

            this.stateManager.setAuthenticated(
                false
            );

        }


        this.state =
            this.stateManager.getState();


        this.showLogin();

    },


    /* ============================================================
       DESKTOP
    ============================================================ */

    showDesktop() {

        if (!this.stateManager) {

            return;

        }


        const user =
            this.stateManager.getUser();


        if (!user) {

            this.showSetup();

            return;

        }


        if (
            !this.stateManager.isAuthenticated()
        ) {

            this.showLogin();

            return;

        }


        this.switchScreen(
            "desktop"
        );


        this.initializeDesktop();


        this.startClock();


        /*
         * Window Manager should normally
         * already exist.
         */

        if (!this.windowManager) {

            this.initializeWindowManager();

        }

    },


    /* ============================================================
       DESKTOP INITIALIZATION
    ============================================================ */

    initializeDesktop() {

        this.updateDesktopGreeting();

        this.updateClock();

        this.updateDesktopAvatar();

        this.bindDesktopEvents();

    },


    /* ============================================================
       DESKTOP GREETING
    ============================================================ */

    updateDesktopGreeting() {

        const greetingElement =
            document.getElementById(
                "desktop-greeting"
            );


        const timeElement =
            document.getElementById(
                "desktop-greeting-time"
            );


        if (!greetingElement) {

            return;

        }


        const user =
            this.stateManager?.getUser();


        if (!user) {

            greetingElement.textContent =
                "User";

            return;

        }


        greetingElement.textContent =
            user.name || "User";


        if (!timeElement) {

            return;

        }


        const hour =
            new Date().getHours();


        if (
            hour >= 5 &&
            hour < 12
        ) {

            timeElement.textContent =
                "Good Morning,";

        }
        else if (
            hour >= 12 &&
            hour < 17
        ) {

            timeElement.textContent =
                "Good Afternoon,";

        }
        else if (
            hour >= 17 &&
            hour < 21
        ) {

            timeElement.textContent =
                "Good Evening,";

        }
        else {

            timeElement.textContent =
                "Good Night,";

        }

    },


    /* ============================================================
       CLOCK
    ============================================================ */

    updateClock() {

        const clock =
            document.getElementById(
                "desktop-time"
            );


        if (!clock) {

            return;

        }


        clock.textContent =
            new Date().toLocaleTimeString(
                [],
                {
                    hour: "numeric",
                    minute: "2-digit"
                }
            );

    },


    startClock() {

        this.stopClock();


        this.clockInterval =
            setInterval(() => {

                this.updateClock();

                this.updateDesktopGreeting();

            }, 1000);

    },


    stopClock() {

        if (this.clockInterval) {

            clearInterval(
                this.clockInterval
            );

            this.clockInterval = null;

        }

    },


    /* ============================================================
       AVATAR
    ============================================================ */

    setAvatar(
        element,
        image,
        name
    ) {

        if (!element) {

            return;

        }


        element.innerHTML = "";


        if (image) {

            const img =
                document.createElement(
                    "img"
                );


            img.src = image;

            img.alt =
                `${name || "User"} profile`;


            element.appendChild(
                img
            );

        }
        else {

            element.textContent =
                this.getInitial(name);

        }

    },


    getInitial(name) {

        if (!name) {

            return "N";

        }


        return name
            .trim()
            .charAt(0)
            .toUpperCase();

    },


    updateDesktopAvatar() {

        const avatar =
            document.getElementById(
                "desktop-avatar"
            );


        const user =
            this.stateManager?.getUser();


        if (
            !avatar ||
            !user
        ) {

            return;

        }


        this.setAvatar(
            avatar,
            user.avatar,
            user.name
        );

    },


    /* ============================================================
       AVATAR UPLOAD
    ============================================================ */

    handleAvatarUpload(event) {

        if (
            this.authManager &&
            typeof this.authManager.handleAvatarUpload ===
                "function"
        ) {

            this.authManager.handleAvatarUpload(
                event
            );

            return;

        }


        /*
         * Fallback for compatibility.
         */

        const file =
            event.target.files?.[0];


        if (!file) {

            return;

        }


        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            return;

        }


        const reader =
            new FileReader();


        reader.onload = () => {

            const avatar =
                document.getElementById(
                    "setup-avatar"
                );


            if (!avatar) {

                return;

            }


            this.setAvatar(
                avatar,
                reader.result,
                "Nexus"
            );


            avatar.dataset.image =
                reader.result;

        };


        reader.readAsDataURL(
            file
        );

    },


    /* ============================================================
       GLOBAL EVENTS
    ============================================================ */

    bindEvents() {

        if (this.eventsBound) {

            return;

        }


        this.eventsBound = true;


        /* --------------------------------------------------------
           Avatar Button
        -------------------------------------------------------- */

        const avatarButton =
            document.getElementById(
                "change-avatar-btn"
            );


        const avatarInput =
            document.getElementById(
                "avatar-input"
            );


        if (
            avatarButton &&
            avatarInput
        ) {

            avatarButton.addEventListener(
                "click",
                () => {

                    avatarInput.click();

                }
            );


            avatarInput.addEventListener(
                "change",
                (event) => {

                    this.handleAvatarUpload(
                        event
                    );

                }
            );

        }


        /* --------------------------------------------------------
           Setup Form
        -------------------------------------------------------- */

        const setupForm =
            document.getElementById(
                "setup-form"
            );


        if (setupForm) {

            setupForm.addEventListener(
                "submit",
                (event) => {

                    event.preventDefault();

                    this.handleSetup();

                }
            );

        }


        /* --------------------------------------------------------
           Login Form
        -------------------------------------------------------- */

        const loginForm =
            document.getElementById(
                "login-form"
            );


        if (loginForm) {

            loginForm.addEventListener(
                "submit",
                (event) => {

                    event.preventDefault();

                    this.handleLogin();

                }
            );

        }


        /* --------------------------------------------------------
           Forgot Password
        -------------------------------------------------------- */

        const forgotPassword =
            document.getElementById(
                "forgot-password"
            );


        if (forgotPassword) {

            forgotPassword.addEventListener(
                "click",
                () => {

                    this.showForgotPasswordMessage();

                }
            );

        }


        /*
         * IMPORTANT:
         *
         * No global keydown listener here.
         *
         * shortcut-manager.js owns keyboard shortcuts.
         */

    },


    /* ============================================================
       DESKTOP EVENTS
    ============================================================ */

    bindDesktopEvents() {

        if (this.desktopEventsBound) {

            return;

        }


        this.desktopEventsBound = true;


        /* --------------------------------------------------------
           Event Manager → Nexus
        -------------------------------------------------------- */

        this.bindDesktopIconEvents();


        /* --------------------------------------------------------
           Dock
        -------------------------------------------------------- */

        const dockItems =
            document.querySelectorAll(
                ".dock-item"
            );


        dockItems.forEach(
            (item) => {

                item.addEventListener(
                    "click",
                    () => {

                        const app =
                            item.dataset.app;


                        /*
                         * Launcher is not an application.
                         */

                        if (
                            app ===
                            "launcher"
                        ) {

                            this.toggleLauncher();

                            return;

                        }


                        dockItems.forEach(
                            (dock) => {

                                dock.classList.remove(
                                    "active"
                                );

                            }
                        );


                        item.classList.add(
                            "active"
                        );


                        if (app) {

                            this.openApplication(
                                app
                            );

                        }

                    }
                );

            }
        );


        /* --------------------------------------------------------
           Profile
        -------------------------------------------------------- */

        const profileButton =
            document.getElementById(
                "desktop-profile-button"
            );


        if (profileButton) {

            profileButton.addEventListener(
                "click",
                () => {

                    this.handleProfileClick();

                }
            );

        }


        /* --------------------------------------------------------
           Desktop Search
        -------------------------------------------------------- */

        const search =
            document.getElementById(
                "desktop-search"
            );


        if (search) {

            search.addEventListener(
                "keydown",
                (event) => {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        const query =
                            search.value.trim();


                        if (query) {

                            this.handleGlobalSearch(
                                query
                            );

                        }

                    }

                }
            );

        }


        /* --------------------------------------------------------
           Launcher Close
        -------------------------------------------------------- */

        const launcherClose =
            document.getElementById(
                "launcher-close"
            );


        if (launcherClose) {

            launcherClose.addEventListener(
                "click",
                () => {

                    this.closeLauncher();

                }
            );

        }


        /* --------------------------------------------------------
           Launcher Apps
        -------------------------------------------------------- */

        const launcherApps =
            document.querySelectorAll(
                ".launcher-app"
            );


        launcherApps.forEach(
            (app) => {

                app.addEventListener(
                    "click",
                    () => {

                        const appName =
                            app.dataset.app;


                        this.closeLauncher();


                        if (appName) {

                            this.openApplication(
                                appName
                            );

                        }

                    }
                );

            }
        );


        /* --------------------------------------------------------
           Launcher Search
        -------------------------------------------------------- */

        const launcherSearch =
            document.getElementById(
                "launcher-search-input"
            );


        if (launcherSearch) {

            launcherSearch.addEventListener(
                "input",
                () => {

                    this.filterLauncherApps(
                        launcherSearch.value
                    );

                }
            );

        }


        /* --------------------------------------------------------
           Launcher Backdrop
        -------------------------------------------------------- */

        const launcher =
            document.getElementById(
                "application-launcher"
            );


        if (launcher) {

            launcher.addEventListener(
                "click",
                (event) => {

                    if (
                        event.target ===
                        launcher
                    ) {

                        this.closeLauncher();

                    }

                }
            );

        }


        /* --------------------------------------------------------
           Nexus Brand
        -------------------------------------------------------- */

        const brand =
            document.getElementById(
                "nexus-brand"
            );


        if (brand) {

            brand.addEventListener(
                "click",
                () => {

                    this.focusDesktop();

                }
            );

        }


        /* --------------------------------------------------------
           Top Menus
        -------------------------------------------------------- */

        const menuButtons =
            document.querySelectorAll(
                ".topbar-menu"
            );


        menuButtons.forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        menuButtons.forEach(
                            (menu) => {

                                menu.classList.remove(
                                    "active"
                                );

                            }
                        );


                        button.classList.add(
                            "active"
                        );

                    }
                );

            }
        );

    },


    /* ============================================================
       DESKTOP ICON EVENTS
    ============================================================ */

    bindDesktopIconEvents() {

        if (this.desktopIconEventBound) {

            return;

        }


        /*
         * Event Manager emits:
         *
         * nexus:desktop:icon-open
         *
         * with appId in event.detail.
         */

        const handler =
            (event) => {

                const appId =
                    event.detail?.appId ||
                    event.detail?.app ||
                    event.detail?.appName;


                if (!appId) {

                    return;

                }


                this.openApplication(
                    appId
                );

            };


        document.addEventListener(
            "nexus:desktop:icon-open",
            handler
        );


        this.desktopIconEventBound =
            true;

    },


    /* ============================================================
       OPEN APPLICATION
    ============================================================ */

    openApplication(appName) {

        if (!appName) {

            return null;

        }


        if (!this.appManager) {

            console.error(
                "Nexus Error: App Manager unavailable."
            );

            return null;

        }


        /*
         * Make sure Window Manager exists.
         */

        if (!this.windowManager) {

            this.initializeWindowManager();

        }


        if (!this.windowManager) {

            console.error(
                "Nexus Error: Window Manager unavailable."
            );

            return null;

        }


        console.log(
            "Opening:",
            appName
        );


        /*
         * App Manager handles:
         *
         * - application registry
         * - application config
         * - window creation
         * - single instance
         */

        const result =
            this.appManager.openApplication(
                appName,
                this.windowManager
            );


        if (!result) {

            console.warn(
                "Unknown Nexus application:",
                appName
            );

            return null;

        }


        return result;

    },


    /* ============================================================
       APPLICATION CONFIGURATION
    ============================================================ */

    getApplicationConfig(appName) {

        if (!this.appManager) {

            return null;

        }


        return this.appManager.getApplicationConfig(
            appName
        );

    },


    /* ============================================================
       LAUNCHER
    ============================================================ */

    openLauncher() {

        const launcher =
            document.getElementById(
                "application-launcher"
            );


        if (!launcher) {

            return;

        }


        launcher.classList.add(
            "active"
        );


        launcher.setAttribute(
            "aria-hidden",
            "false"
        );


        const search =
            document.getElementById(
                "launcher-search-input"
            );


        if (search) {

            search.value = "";


            this.filterLauncherApps(
                ""
            );


            setTimeout(() => {

                search.focus();

            }, 100);

        }

    },


    closeLauncher() {

        const launcher =
            document.getElementById(
                "application-launcher"
            );


        if (!launcher) {

            return;

        }


        launcher.classList.remove(
            "active"
        );


        launcher.setAttribute(
            "aria-hidden",
            "true"
        );

    },


    toggleLauncher() {

        const launcher =
            document.getElementById(
                "application-launcher"
            );


        if (!launcher) {

            return;

        }


        if (
            launcher.classList.contains(
                "active"
            )
        ) {

            this.closeLauncher();

        }
        else {

            this.openLauncher();

        }

    },


    /* ============================================================
       LAUNCHER SEARCH
    ============================================================ */

    filterLauncherApps(query) {

        const searchQuery =
            (query || "")
                .trim()
                .toLowerCase();


        const apps =
            document.querySelectorAll(
                ".launcher-app"
            );


        apps.forEach(
            (app) => {

                const name =
                    app
                        .querySelector(
                            "span:last-child"
                        )
                        ?.textContent
                        .trim()
                        .toLowerCase() ||
                    "";


                app.style.display =
                    name.includes(
                        searchQuery
                    )
                        ? ""
                        : "none";

            }
        );

    },


    /* ============================================================
       PROFILE
    ============================================================ */

    handleProfileClick() {

        this.openApplication(
            "settings"
        );

    },


    /* ============================================================
       GLOBAL SEARCH
    ============================================================ */

    handleGlobalSearch(query) {

        if (!query) {

            return;

        }


        console.log(
            "Nexus Search:",
            query
        );


        /*
         * Use App Manager instead of
         * maintaining another app list here.
         */

        if (
            this.appManager &&
            typeof this.appManager.searchApplications ===
                "function"
        ) {

            const results =
                this.appManager.searchApplications(
                    query
                );


            if (
                results &&
                results.length > 0
            ) {

                const first =
                    results[0];


                const appId =
                    first.id ||
                    first.appId;


                if (appId) {

                    this.openApplication(
                        appId
                    );

                }


                return;

            }

        }


        /*
         * Compatibility fallback.
         */

        const applications = [
            "files",
            "projects",
            "browser",
            "notes",
            "settings",
            "terminal",
            "trash",
            "about"
        ];


        const normalizedQuery =
            query
                .toLowerCase()
                .trim();


        const result =
            applications.find(
                (app) =>
                    app.includes(
                        normalizedQuery
                    )
            );


        if (result) {

            this.openApplication(
                result
            );

        }

    },


    /* ============================================================
       KEYBOARD COMPATIBILITY
    ============================================================ */

    handleGlobalKeyboard(event) {

        /*
         * Keyboard events are now owned by
         * Shortcut Manager.
         *
         * This method exists only for
         * backwards compatibility.
         */

        if (
            this.shortcutManager &&
            typeof this.shortcutManager.handleKeyDown ===
                "function"
        ) {

            this.shortcutManager.handleKeyDown(
                event
            );

        }

    },


    isTyping(element) {

        if (
            this.shortcutManager &&
            typeof this.shortcutManager.isTyping ===
                "function"
        ) {

            return this.shortcutManager.isTyping(
                element
            );

        }


        if (!element) {

            return false;

        }


        const tag =
            element.tagName?.toLowerCase();


        return (
            tag === "input" ||
            tag === "textarea" ||
            tag === "select" ||
            element.isContentEditable
        );

    },


    /* ============================================================
       SEARCH FOCUS
    ============================================================ */

    focusSearch() {

        const search =
            document.getElementById(
                "desktop-search"
            );


        if (!search) {

            return;

        }


        search.focus();

        search.select();

    },


    /* ============================================================
       DESKTOP FOCUS
    ============================================================ */

    focusDesktop() {

        /*
         * If a window is currently active,
         * don't steal focus from it.
         */

        if (
            this.windowManager &&
            this.windowManager.getActiveWindow()
        ) {

            return;

        }


        console.log(
            "Nexus desktop focused."
        );

    },


    /* ============================================================
       SCREEN SWITCH
    ============================================================ */

    switchScreen(screenName) {

        if (!screenName) {

            return;

        }


        const screens =
            document.querySelectorAll(
                ".screen"
            );


        screens.forEach(
            (screen) => {

                screen.classList.remove(
                    "active"
                );

            }
        );


        const target =
            document.getElementById(
                screenName
            );


        if (!target) {

            console.error(
                `Nexus Error: Screen "${screenName}" not found.`
            );

            return;

        }


        target.classList.add(
            "active"
        );


        if (this.stateManager) {

            this.stateManager.setCurrentScreen(
                screenName
            );


            this.state =
                this.stateManager.getState();

        }

    },


    /* ============================================================
       FORGOT PASSWORD
    ============================================================ */

    showForgotPasswordMessage() {

        if (
            this.authManager &&
            typeof this.authManager.showForgotPasswordMessage ===
                "function"
        ) {

            this.authManager.showForgotPasswordMessage();

            return;

        }


        const error =
            document.getElementById(
                "login-error"
            );


        if (!error) {

            return;

        }


        error.textContent =
            "Password recovery is available through Nexus Settings.";

    },


    /* ============================================================
       RESET USER
    ============================================================ */

    resetUser() {

        console.log(
            "Resetting Nexus user..."
        );


        if (this.windowManager) {

            this.windowManager.closeAll();

        }


        if (this.authManager) {

            this.authManager.deleteUser();

        }
        else {

            localStorage.removeItem(
                "nexusUser"
            );

        }


        if (this.stateManager) {

            this.stateManager.setUser(
                null
            );


            this.stateManager.setAuthenticated(
                false
            );

        }


        this.state =
            this.stateManager.getState();


        this.showSetup();


        console.log(
            "Nexus user reset."
        );

    },


    /* ============================================================
       COMPLETE RESET
    ============================================================ */

    resetNexus() {

        console.log(
            "Resetting Nexus completely..."
        );


        if (this.windowManager) {

            this.windowManager.closeAll();

        }


        this.stopClock();


        if (this.bootManager) {

            this.bootManager.stop();

        }


        if (this.stateManager) {

            this.stateManager.resetAll();

        }
        else {

            localStorage.removeItem(
                "nexusUser"
            );

            localStorage.removeItem(
                "nexusSettings"
            );

        }


        this.state =
            this.stateManager?.getState() ||
            null;


        this.showSetup();


        console.log(
            "Nexus completely reset."
        );

    },


    /* ============================================================
       HTML ESCAPE
    ============================================================ */

    escapeHtml(value) {

        const element =
            document.createElement(
                "div"
            );


        element.textContent =
            value ?? "";


        return element.innerHTML;

    }

};


/* ================================================================
   START NEXUS
================================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        Nexus.init();

    }
);


/* ================================================================
   GLOBAL ACCESS
================================================================ */

window.Nexus = Nexus;