/* ================================================================
   NEXUS AUTH MANAGER
   Module 1 - Core System

   Responsibilities:
   - User setup
   - User creation
   - User loading
   - Login
   - Logout
   - Password validation
   - Avatar handling
   - Authentication state

   Note:
   This is a browser-based demo OS. User credentials are stored
   in localStorage for the project demonstration.
================================================================ */


/* ================================================================
   NEXUS AUTH MANAGER CLASS
================================================================ */

class NexusAuthManager {

    constructor(options = {}) {

        /* --------------------------------------------------------
           Storage
        -------------------------------------------------------- */

        this.storageKey =
            options.storageKey ||
            "nexusUser";


        /* --------------------------------------------------------
           State Manager
        -------------------------------------------------------- */

        this.stateManager =
            options.stateManager ||
            window.nexusStateManager ||
            null;


        /* --------------------------------------------------------
           Minimum Password Length
        -------------------------------------------------------- */

        this.minPasswordLength =
            options.minPasswordLength || 4;


        console.log(
            "Nexus Auth Manager created."
        );
    }


    /* ============================================================
       INITIALIZE
    ============================================================ */

    init() {

        this.stateManager =
            this.stateManager ||
            window.nexusStateManager ||
            null;


        /*
         * Load the existing user if available.
         */

        this.loadUser();


        console.log(
            "Nexus Auth Manager initialized."
        );


        return true;
    }


    /* ============================================================
       USER EXISTENCE
    ============================================================ */

    hasUser() {

        try {

            return Boolean(
                localStorage.getItem(
                    this.storageKey
                )
            );

        } catch (error) {

            console.error(
                "Nexus Auth Manager: Unable to check user.",
                error
            );

            return false;
        }
    }


    /* ============================================================
       LOAD USER
    ============================================================ */

    loadUser() {

        try {

            const storedUser =
                localStorage.getItem(
                    this.storageKey
                );


            if (!storedUser) {

                this.setStateUser(null);

                return null;
            }


            const user =
                JSON.parse(storedUser);


            if (!user || typeof user !== "object") {

                this.setStateUser(null);

                return null;
            }


            this.setStateUser(user);


            return user;

        } catch (error) {

            console.error(
                "Nexus Auth Manager: Failed to load user.",
                error
            );


            this.setStateUser(null);


            return null;
        }
    }


    /* ============================================================
       GET CURRENT USER
    ============================================================ */

    getUser() {

        if (this.stateManager) {

            return this.stateManager.getUser();
        }


        return this.loadUser();
    }


    /* ============================================================
       SAVE USER
    ============================================================ */

    saveUser(user) {

        if (!user) {

            return false;
        }


        try {

            localStorage.setItem(
                this.storageKey,
                JSON.stringify(user)
            );


            this.setStateUser(user);


            return true;

        } catch (error) {

            console.error(
                "Nexus Auth Manager: Failed to save user.",
                error
            );


            return false;
        }
    }


    /* ============================================================
       CREATE USER
    ============================================================ */

    createUser(
        name,
        password,
        avatar = null
    ) {

        /* --------------------------------------------------------
           Validate name
        -------------------------------------------------------- */

        const cleanName =
            String(name || "").trim();


        if (!cleanName) {

            return {
                success: false,
                message: "Please enter your name."
            };
        }


        /* --------------------------------------------------------
           Validate password
        -------------------------------------------------------- */

        const passwordValidation =
            this.validatePassword(password);


        if (!passwordValidation.valid) {

            return {
                success: false,
                message:
                    passwordValidation.message
            };
        }


        /* --------------------------------------------------------
           Prevent duplicate user
        -------------------------------------------------------- */

        if (this.hasUser()) {

            return {
                success: false,
                message:
                    "A Nexus user already exists."
            };
        }


        /* --------------------------------------------------------
           Create user object
        -------------------------------------------------------- */

        const user = {

            name: cleanName,

            password: String(password),

            avatar: avatar || null,

            createdAt:
                new Date().toISOString()

        };


        /* --------------------------------------------------------
           Save
        -------------------------------------------------------- */

        const saved =
            this.saveUser(user);


        if (!saved) {

            return {
                success: false,
                message:
                    "Unable to create Nexus user."
            };
        }


        /* --------------------------------------------------------
           User is created but NOT logged in automatically
           unless Nexus Core decides to authenticate them.
        -------------------------------------------------------- */

        this.setAuthenticated(false);


        return {
            success: true,
            user: user,
            message:
                "Nexus user created successfully."
        };
    }


    /* ============================================================
       LOGIN
    ============================================================ */

    login(password) {

        const user =
            this.loadUser();


        if (!user) {

            return {
                success: false,
                message:
                    "No Nexus user found."
            };
        }


        const enteredPassword =
            String(password || "");


        /* --------------------------------------------------------
           Empty password
        -------------------------------------------------------- */

        if (!enteredPassword) {

            return {
                success: false,
                message:
                    "Please enter your password."
            };
        }


        /* --------------------------------------------------------
           Password comparison
        -------------------------------------------------------- */

        if (
            enteredPassword !==
            String(user.password || "")
        ) {

            return {
                success: false,
                message:
                    "Incorrect password."
            };
        }


        /* --------------------------------------------------------
           Authentication successful
        -------------------------------------------------------- */

        this.setAuthenticated(true);


        return {
            success: true,
            user: user,
            message:
                "Login successful."
        };
    }


    /* ============================================================
       LOGOUT
    ============================================================ */

    logout() {

        this.setAuthenticated(false);


        /*
         * The user account remains stored.
         *
         * Logout means:
         *     authenticated = false
         *
         * It does NOT delete the Nexus user.
         */


        this.emit(
            "auth:logout",
            {
                user: this.getUser()
            }
        );


        return true;
    }


    /* ============================================================
       DELETE USER
    ============================================================ */

    deleteUser() {

        try {

            localStorage.removeItem(
                this.storageKey
            );

        } catch (error) {

            console.error(
                "Nexus Auth Manager: Failed to delete user.",
                error
            );


            return false;
        }


        this.setStateUser(null);

        this.setAuthenticated(false);


        this.emit(
            "auth:user-deleted"
        );


        return true;
    }


    /* ============================================================
       PASSWORD VALIDATION
    ============================================================ */

    validatePassword(password) {

        const value =
            String(password || "");


        if (!value) {

            return {
                valid: false,
                message:
                    "Please enter a password."
            };
        }


        if (
            value.length <
            this.minPasswordLength
        ) {

            return {
                valid: false,
                message:
                    `Password must be at least ${this.minPasswordLength} characters.`
            };
        }


        return {
            valid: true,
            message: ""
        };
    }


    /* ============================================================
       SETUP VALIDATION
    ============================================================ */

    validateSetup(
        name,
        password,
        confirmPassword
    ) {

        const cleanName =
            String(name || "").trim();


        /* --------------------------------------------------------
           Name
        -------------------------------------------------------- */

        if (!cleanName) {

            return {
                valid: false,
                message:
                    "Please enter your name."
            };
        }


        /* --------------------------------------------------------
           Password
        -------------------------------------------------------- */

        const passwordValidation =
            this.validatePassword(password);


        if (!passwordValidation.valid) {

            return passwordValidation;
        }


        /* --------------------------------------------------------
           Confirm Password
        -------------------------------------------------------- */

        if (
            String(password) !==
            String(confirmPassword)
        ) {

            return {
                valid: false,
                message:
                    "Passwords do not match."
            };
        }


        return {
            valid: true,
            message: ""
        };
    }


    /* ============================================================
       HANDLE SETUP
       Reads the current setup form.
    ============================================================ */

    handleSetup() {

        const nameInput =
            document.getElementById(
                "setup-name"
            );


        const passwordInput =
            document.getElementById(
                "setup-password"
            );


        const confirmPasswordInput =
            document.getElementById(
                "setup-confirm-password"
            );


        const errorElement =
            document.getElementById(
                "setup-error"
            );


        const avatarElement =
            document.getElementById(
                "setup-avatar"
            );


        const name =
            nameInput?.value || "";


        const password =
            passwordInput?.value || "";


        const confirmPassword =
            confirmPasswordInput?.value || "";


        const validation =
            this.validateSetup(
                name,
                password,
                confirmPassword
            );


        if (!validation.valid) {

            this.showError(
                errorElement,
                validation.message
            );


            return {
                success: false,
                message: validation.message
            };
        }


        /* --------------------------------------------------------
           Get avatar
        -------------------------------------------------------- */

        let avatar = null;


        if (
            avatarElement &&
            avatarElement.dataset.image
        ) {

           avatar = avatarElement.dataset.image
        }

        console.log(
        "Nexus Auth Manager: Avatar available:",
        Boolean(avatar)
    );


        /* --------------------------------------------------------
           Create user
        -------------------------------------------------------- */

        const result =
            this.createUser(
                name,
                password,
                avatar
            );


        if (!result.success) {

            this.showError(
                errorElement,
                result.message
            );


            return result;
        }


        this.clearError(
            errorElement
        );


        /* --------------------------------------------------------
           Clear form
        -------------------------------------------------------- */

        if (passwordInput) {
            passwordInput.value = "";
        }


        if (confirmPasswordInput) {
            confirmPasswordInput.value = "";
        }


        this.emit(
            "auth:user-created",
            {
                user: result.user
            }
        );


        return result;
    }


    /* ============================================================
       HANDLE LOGIN
       Reads the current login form.
    ============================================================ */

    handleLogin() {

        const passwordInput =
            document.getElementById(
                "login-password"
            );


        const errorElement =
            document.getElementById(
                "login-error"
            );


        const password =
            passwordInput?.value || "";


        const result =
            this.login(password);


        if (!result.success) {

            this.showError(
                errorElement,
                result.message
            );


            return result;
        }


        this.clearError(
            errorElement
        );


        if (passwordInput) {

            passwordInput.value = "";
        }


        this.emit(
            "auth:login",
            {
                user: result.user
            }
        );


        return result;
    }


    /* ============================================================
       AVATAR FILE
    ============================================================ */

    /* ============================================================
   AVATAR FILE
============================================================ */

handleAvatarUpload(fileOrEvent, callback = null) {

    let file = null;

    /* --------------------------------------------------------
       Accept either:
       - File object
       - <input type="file"> change event
    -------------------------------------------------------- */

    if (
        fileOrEvent &&
        fileOrEvent.target &&
        fileOrEvent.target.files
    ) {

        file =
            fileOrEvent.target.files[0];

    }
    else {

        file = fileOrEvent;

    }


    if (!file) {

        console.warn(
            "Nexus Auth Manager: No avatar file selected."
        );

        return false;
    }


    /* --------------------------------------------------------
       Validate image
    -------------------------------------------------------- */

    if (
        !file.type ||
        !file.type.startsWith("image/")
    ) {

        console.warn(
            "Nexus Auth Manager: Selected file is not an image.",
            file
        );

        return false;
    }


    console.log(
        "Nexus Auth Manager: Avatar selected:",
        file.name,
        file.type
    );


    /* --------------------------------------------------------
       Read image
    -------------------------------------------------------- */

    const reader =
        new FileReader();


    reader.onload = (event) => {

        const avatar =
            event.target?.result;


        if (
            typeof avatar !== "string" ||
            !avatar.startsWith("data:image/")
        ) {

            console.error(
                "Nexus Auth Manager: Invalid avatar data."
            );

            return;
        }


        /* ----------------------------------------------------
           Setup avatar
        ---------------------------------------------------- */

        const avatarElement =
            document.getElementById(
                "setup-avatar"
            );


        if (avatarElement) {

            avatarElement.innerHTML = "";

            const image =
                document.createElement("img");


            image.src = avatar;

            image.alt =
                "Profile photo";


            image.style.width = "100%";
            image.style.height = "100%";
            image.style.objectFit = "cover";
            image.style.borderRadius = "inherit";


            avatarElement.appendChild(
                image
            );


            /*
             * IMPORTANT:
             * Store image data on the DIV itself.
             */
            avatarElement.dataset.image =
                avatar;
        }


        if (
            typeof callback === "function"
        ) {

            callback(avatar);

        }

    };


    reader.onerror = () => {

        console.error(
            "Nexus Auth Manager: Failed to read avatar."
        );

    };


    reader.readAsDataURL(file);


    return true;
}


    /* ============================================================
       SHOW USER AVATAR
    ============================================================ */

    setAvatar(
        element,
        user = null
    ) {

        if (!element) {

            return;
        }


        const currentUser =
            user || this.getUser();


        if (
            currentUser &&
            currentUser.avatar
        ) {

            element.src =
                currentUser.avatar;


            element.classList.add(
                "has-avatar"
            );


            return;
        }


        element.classList.remove(
            "has-avatar"
        );


        const initial =
            this.getInitial(
                currentUser?.name
            );


        /*
         * The current Nexus UI can use
         * the element's text/initial when
         * there is no uploaded image.
         */

        if (
            element.tagName !== "IMG"
        ) {

            element.textContent =
                initial;
        }
    }


    /* ============================================================
       GET USER INITIAL
    ============================================================ */

    getInitial(name) {

        const value =
            String(name || "").trim();


        if (!value) {

            return "N";
        }


        return value
            .charAt(0)
            .toUpperCase();
    }


    /* ============================================================
       FORGOT PASSWORD
    ============================================================ */

    showForgotPasswordMessage() {

        const message =
            "Password recovery is available through Nexus Settings.";


        this.emit(
            "auth:forgot-password",
            {
                message: message
            }
        );


        return message;
    }


    /* ============================================================
       AUTHENTICATION STATE HELPERS
    ============================================================ */

    setAuthenticated(value) {

        if (this.stateManager) {

            return this.stateManager
                .setAuthenticated(value);
        }


        return Boolean(value);
    }


    isAuthenticated() {

        if (this.stateManager) {

            return this.stateManager
                .isAuthenticated();
        }


        return false;
    }


    setStateUser(user) {

        if (this.stateManager) {

            this.stateManager.setUser(
                user
            );
        }
    }


    /* ============================================================
       ERROR DISPLAY
    ============================================================ */

    showError(
        element,
        message
    ) {

        if (!element) {

            return;
        }


        element.textContent =
            message || "";


        element.classList.add(
            "visible"
        );
    }


    /* ============================================================
       CLEAR ERROR
    ============================================================ */

    clearError(element) {

        if (!element) {

            return;
        }


        element.textContent = "";


        element.classList.remove(
            "visible"
        );
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
       RESET
    ============================================================ */

    reset() {

        this.deleteUser();

        return true;
    }
}


/* ================================================================
   GLOBAL EXPORT
================================================================ */

window.NexusAuthManager =
    NexusAuthManager;


/* ================================================================
   GLOBAL INSTANCE
================================================================ */

window.nexusAuthManager =
    new NexusAuthManager({
        stateManager:
            window.nexusStateManager
    });