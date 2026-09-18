/* ================================================================
   NEXUS EVENT MANAGER
   Module 1 - Core System

   Responsibilities:
   - Desktop icon selection
   - Desktop icon dragging
   - Desktop icon position handling
   - Global pointer events
   - Prevent accidental drag/click conflicts

   Application opening remains controlled by Nexus Core.
================================================================ */


/* ================================================================
   NEXUS EVENT MANAGER CLASS
================================================================ */

class NexusEventManager {

    constructor(options = {}) {

        /* --------------------------------------------------------
           Configuration
        -------------------------------------------------------- */

        this.desktopArea =
            options.desktopArea ||
            document.querySelector(".nexus-desktop-area");


        this.desktopIconContainer =
            options.desktopIconContainer ||
            document.querySelector(".desktop-icon-column");


        /* --------------------------------------------------------
           State
        -------------------------------------------------------- */

        this.initialized = false;

        this.selectedIcon = null;

        this.dragState = {

            active: false,

            icon: null,

            pointerId: null,

            startX: 0,

            startY: 0,

            startLeft: 0,

            startTop: 0,

            moved: false
        };


        /* --------------------------------------------------------
           Configuration values
        -------------------------------------------------------- */

        this.dragThreshold = 5;

        this.desktopPadding = 10;


        /* --------------------------------------------------------
           Bind methods
        -------------------------------------------------------- */

        this.handlePointerDown =
            this.handlePointerDown.bind(this);

        this.handlePointerMove =
            this.handlePointerMove.bind(this);

        this.handlePointerUp =
            this.handlePointerUp.bind(this);

        this.handleIconClick =
            this.handleIconClick.bind(this);

        this.handleIconDoubleClick =
            this.handleIconDoubleClick.bind(this);


        console.log(
            "Nexus Event Manager created."
        );
    }


    /* ============================================================
       INITIALIZE
    ============================================================ */

    init() {

        if (this.initialized) {
            return;
        }


        this.desktopArea =
            this.desktopArea ||
            document.querySelector(
                ".nexus-desktop-area"
            );


        this.desktopIconContainer =
            this.desktopIconContainer ||
            document.querySelector(
                ".desktop-icon-column"
            );


        if (!this.desktopArea) {

            console.warn(
                "Nexus Event Manager: Desktop area not found."
            );

            return;
        }


        if (!this.desktopIconContainer) {

            console.warn(
                "Nexus Event Manager: Desktop icon container not found."
            );

            return;
        }


        this.bindDesktopIcons();

        this.bindGlobalEvents();


        this.initialized = true;


        console.log(
            "Nexus Event Manager initialized."
        );
    }


    /* ============================================================
       DESKTOP ICON EVENTS
    ============================================================ */

    bindDesktopIcons() {

        const icons =
            this.desktopIconContainer.querySelectorAll(
                ".nexus-desktop-icon"
            );


        icons.forEach((icon) => {

            /* ----------------------------------------------------
               Pointer Down
            ---------------------------------------------------- */

            icon.addEventListener(
                "pointerdown",
                this.handlePointerDown
            );


            /* ----------------------------------------------------
               Click
            ---------------------------------------------------- */

            icon.addEventListener(
                "click",
                this.handleIconClick
            );


            /*
             * IMPORTANT:
             *
             * We intentionally do NOT open the application here.
             *
             * Your current nexus.js already handles:
             *
             *     dblclick -> openApplication()
             *
             * So Event Manager handles interaction,
             * while Nexus Core handles application opening.
             */


            /* ----------------------------------------------------
               Double Click
            ---------------------------------------------------- */

            icon.addEventListener(
                "dblclick",
                this.handleIconDoubleClick
            );

        });


        console.log(
            `Nexus Event Manager: ${icons.length} desktop icons registered.`
        );
    }


    /* ============================================================
       POINTER DOWN
    ============================================================ */

    handlePointerDown(event) {

        const icon =
            event.currentTarget;


        /* --------------------------------------------------------
           Ignore non-primary mouse button
        -------------------------------------------------------- */

        if (
            event.pointerType === "mouse" &&
            event.button !== 0
        ) {

            return;
        }


        /* --------------------------------------------------------
           Select icon
        -------------------------------------------------------- */

        this.selectIcon(icon);


        /* --------------------------------------------------------
           Get current icon position
        -------------------------------------------------------- */

        const computedStyle =
            window.getComputedStyle(icon);


        let left =
            parseFloat(
                computedStyle.left
            );


        let top =
            parseFloat(
                computedStyle.top
            );


        /*
         * If left/top are not explicitly available,
         * use offset position.
         */

        if (Number.isNaN(left)) {

            left =
                icon.offsetLeft;
        }


        if (Number.isNaN(top)) {

            top =
                icon.offsetTop;
        }


        /* --------------------------------------------------------
           Create drag state
        -------------------------------------------------------- */

        this.dragState = {

            active: false,

            icon: icon,

            pointerId: event.pointerId,

            startX: event.clientX,

            startY: event.clientY,

            startLeft: left,

            startTop: top,

            moved: false
        };


        /* --------------------------------------------------------
           Capture pointer
        -------------------------------------------------------- */

        try {

            icon.setPointerCapture(
                event.pointerId
            );

        }
        catch (error) {

            console.warn(
                "Nexus Event Manager: Pointer capture unavailable.",
                error
            );
        }


        /*
         * Do not preventDefault immediately.
         *
         * Doing that can interfere with the browser's
         * normal double-click detection.
         */
    }


    /* ============================================================
       POINTER MOVE
    ============================================================ */

    handlePointerMove(event) {

        const state =
            this.dragState;


        if (!state.icon) {
            return;
        }


        if (
            state.pointerId !==
            event.pointerId
        ) {

            return;
        }


        /* --------------------------------------------------------
           Calculate movement
        -------------------------------------------------------- */

        const deltaX =
            event.clientX -
            state.startX;


        const deltaY =
            event.clientY -
            state.startY;


        const distance =
            Math.sqrt(
                deltaX * deltaX +
                deltaY * deltaY
            );


        /* --------------------------------------------------------
           Start dragging after threshold
        -------------------------------------------------------- */

        if (
            !state.active &&
            distance >= this.dragThreshold
        ) {

            state.active = true;

            state.moved = true;


            this.startIconDrag(
                state.icon
            );
        }


        if (!state.active) {
            return;
        }


        /* --------------------------------------------------------
           Prevent browser text/image dragging
        -------------------------------------------------------- */

        event.preventDefault();


        /* --------------------------------------------------------
           Calculate new position
        -------------------------------------------------------- */

        let newLeft =
            state.startLeft +
            deltaX;


        let newTop =
            state.startTop +
            deltaY;


        /* --------------------------------------------------------
           Keep icon inside desktop
        -------------------------------------------------------- */

        const position =
            this.getBoundedPosition(
                state.icon,
                newLeft,
                newTop
            );


        newLeft =
            position.left;


        newTop =
            position.top;


        /* --------------------------------------------------------
           Apply position
        -------------------------------------------------------- */

        state.icon.style.left =
            `${newLeft}px`;


        state.icon.style.top =
            `${newTop}px`;


        /* --------------------------------------------------------
           Event
        -------------------------------------------------------- */

        this.emit(
            "desktop:icon-moved",
            {

                icon:
                    state.icon,

                app:
                    state.icon.dataset.app,

                left:
                    newLeft,

                top:
                    newTop

            }
        );
    }


    /* ============================================================
       POINTER UP
    ============================================================ */

    handlePointerUp(event) {

        const state =
            this.dragState;


        if (!state.icon) {
            return;
        }


        if (
            state.pointerId !==
            event.pointerId
        ) {

            return;
        }


        const icon =
            state.icon;


        /* --------------------------------------------------------
           Release pointer capture
        -------------------------------------------------------- */

        try {

            if (
                icon.hasPointerCapture &&
                icon.hasPointerCapture(
                    event.pointerId
                )
            ) {

                icon.releasePointerCapture(
                    event.pointerId
                );
            }

        }
        catch (error) {

            console.warn(
                "Nexus Event Manager: Unable to release pointer capture.",
                error
            );
        }


        /* --------------------------------------------------------
           Stop drag
        -------------------------------------------------------- */

        if (state.active) {

            this.stopIconDrag(
                icon
            );


            this.emit(
                "desktop:icon-dropped",
                {

                    icon:
                        icon,

                    app:
                        icon.dataset.app,

                    left:
                        parseFloat(
                            icon.style.left
                        ) || 0,

                    top:
                        parseFloat(
                            icon.style.top
                        ) || 0

                }
            );
        }


        /* --------------------------------------------------------
           Reset state
        -------------------------------------------------------- */

        this.dragState = {

            active: false,

            icon: null,

            pointerId: null,

            startX: 0,

            startY: 0,

            startLeft: 0,

            startTop: 0,

            moved: state.moved
        };


        /*
         * Keep moved information for a short period.
         *
         * This prevents a click immediately after dragging
         * from behaving like a normal selection click.
         */

        if (state.moved) {

            setTimeout(() => {

                if (
                    this.dragState.icon === null
                ) {

                    this.dragState.moved =
                        false;
                }

            }, 80);
        }
    }


    /* ============================================================
       ICON CLICK
    ============================================================ */

    handleIconClick(event) {

        const icon =
            event.currentTarget;


        /*
         * If the user dragged the icon,
         * don't perform another click action.
         */

        if (
            this.dragState.moved
        ) {

            event.preventDefault();

            event.stopPropagation();

            return;
        }


        this.selectIcon(
            icon
        );
    }


    /* ============================================================
       ICON DOUBLE CLICK
    ============================================================ */

    handleIconDoubleClick(event) {

        const icon =
            event.currentTarget;


        /*
         * If the icon was dragged,
         * don't treat the interaction as double-click.
         */

        if (
            this.dragState.moved
        ) {

            event.preventDefault();

            event.stopPropagation();

            return;
        }


        /*
         * Nexus Core already handles opening applications.
         *
         * We only emit an event here so the Core can optionally
         * listen to it in the future.
         */

        this.emit(
            "desktop:icon-open",
            {

                icon:
                    icon,

                app:
                    icon.dataset.app

            }
        );
    }


    /* ============================================================
       SELECT ICON
    ============================================================ */

    selectIcon(icon) {

        if (!icon) {
            return;
        }


        /* --------------------------------------------------------
           Remove selection from previous icon
        -------------------------------------------------------- */

        const icons =
            this.desktopIconContainer?.querySelectorAll(
                ".nexus-desktop-icon"
            );


        if (icons) {

            icons.forEach((item) => {

                item.classList.remove(
                    "selected"
                );

            });
        }


        /* --------------------------------------------------------
           Select current icon
        -------------------------------------------------------- */

        icon.classList.add(
            "selected"
        );


        this.selectedIcon =
            icon;


        /* --------------------------------------------------------
           Event
        -------------------------------------------------------- */

        this.emit(
            "desktop:icon-selected",
            {

                icon:
                    icon,

                app:
                    icon.dataset.app

            }
        );
    }


    /* ============================================================
       START ICON DRAG
    ============================================================ */

    startIconDrag(icon) {

        if (!icon) {
            return;
        }


        icon.classList.add(
            "dragging"
        );


        document.body.classList.add(
            "nexus-desktop-dragging"
        );


        /*
         * Disable text selection while dragging.
         */

        document.body.style.userSelect =
            "none";


        document.body.style.webkitUserSelect =
            "none";
    }


    /* ============================================================
       STOP ICON DRAG
    ============================================================ */

    stopIconDrag(icon) {

        if (!icon) {
            return;
        }


        icon.classList.remove(
            "dragging"
        );


        document.body.classList.remove(
            "nexus-desktop-dragging"
        );


        document.body.style.userSelect =
            "";


        document.body.style.webkitUserSelect =
            "";
    }


    /* ============================================================
       GET BOUNDED POSITION
    ============================================================ */

    getBoundedPosition(
        icon,
        left,
        top
    ) {

        if (
            !this.desktopArea ||
            !icon
        ) {

            return {
                left: left,
                top: top
            };
        }


        const desktopRect =
            this.desktopArea.getBoundingClientRect();


        const iconWidth =
            icon.offsetWidth;


        const iconHeight =
            icon.offsetHeight;


        /* --------------------------------------------------------
           Calculate boundaries
        -------------------------------------------------------- */

        const minLeft =
            this.desktopPadding;


        const minTop =
            this.desktopPadding;


        const maxLeft =
            Math.max(
                minLeft,
                desktopRect.width -
                iconWidth -
                this.desktopPadding
            );


        const maxTop =
            Math.max(
                minTop,
                desktopRect.height -
                iconHeight -
                this.desktopPadding
            );


        /* --------------------------------------------------------
           Clamp position
        -------------------------------------------------------- */

        left =
            Math.max(
                minLeft,
                Math.min(
                    left,
                    maxLeft
                )
            );


        top =
            Math.max(
                minTop,
                Math.min(
                    top,
                    maxTop
                )
            );


        return {

            left: left,

            top: top
        };
    }


    /* ============================================================
       GLOBAL EVENTS
    ============================================================ */

    bindGlobalEvents() {

        /* --------------------------------------------------------
           Pointer Move
        -------------------------------------------------------- */

        document.addEventListener(
            "pointermove",
            this.handlePointerMove
        );


        /* --------------------------------------------------------
           Pointer Up
        -------------------------------------------------------- */

        document.addEventListener(
            "pointerup",
            this.handlePointerUp
        );


        /* --------------------------------------------------------
           Pointer Cancel
        -------------------------------------------------------- */

        document.addEventListener(
            "pointercancel",
            this.handlePointerUp
        );


        /* --------------------------------------------------------
           Desktop Background Click
        -------------------------------------------------------- */

        this.desktopArea.addEventListener(
            "click",
            (event) => {

                if (
                    event.target ===
                    this.desktopArea
                ) {

                    this.clearSelection();
                }

            }
        );


        /* --------------------------------------------------------
           Window Resize
        -------------------------------------------------------- */

        window.addEventListener(
            "resize",
            () => {

                this.repositionIconsInsideBounds();

            }
        );
    }


    /* ============================================================
       CLEAR SELECTION
    ============================================================ */

    clearSelection() {

        if (!this.desktopIconContainer) {
            return;
        }


        const icons =
            this.desktopIconContainer.querySelectorAll(
                ".nexus-desktop-icon"
            );


        icons.forEach((icon) => {

            icon.classList.remove(
                "selected"
            );

        });


        this.selectedIcon =
            null;


        this.emit(
            "desktop:selection-cleared"
        );
    }


    /* ============================================================
       KEEP ICONS INSIDE DESKTOP
    ============================================================ */

    repositionIconsInsideBounds() {

        if (!this.desktopIconContainer) {
            return;
        }


        const icons =
            this.desktopIconContainer.querySelectorAll(
                ".nexus-desktop-icon"
            );


        icons.forEach((icon) => {

            const currentLeft =
                parseFloat(
                    icon.style.left
                );


            const currentTop =
                parseFloat(
                    icon.style.top
                );


            if (
                Number.isNaN(currentLeft) ||
                Number.isNaN(currentTop)
            ) {

                return;
            }


            const position =
                this.getBoundedPosition(
                    icon,
                    currentLeft,
                    currentTop
                );


            icon.style.left =
                `${position.left}px`;


            icon.style.top =
                `${position.top}px`;
        });
    }


    /* ============================================================
       GET SELECTED ICON
    ============================================================ */

    getSelectedIcon() {

        return this.selectedIcon || null;
    }


    /* ============================================================
       GET ICON POSITION
    ============================================================ */

    getIconPosition(icon) {

        if (!icon) {
            return null;
        }


        return {

            left:
                parseFloat(
                    icon.style.left
                ) || 0,

            top:
                parseFloat(
                    icon.style.top
                ) || 0

        };
    }


    /* ============================================================
       SET ICON POSITION
    ============================================================ */

    setIconPosition(
        icon,
        left,
        top
    ) {

        if (!icon) {
            return;
        }


        const position =
            this.getBoundedPosition(
                icon,
                left,
                top
            );


        icon.style.left =
            `${position.left}px`;


        icon.style.top =
            `${position.top}px`;
    }


    /* ============================================================
       GET ALL ICON POSITIONS
    ============================================================ */

    getAllIconPositions() {

        const result = {};


        if (!this.desktopIconContainer) {
            return result;
        }


        const icons =
            this.desktopIconContainer.querySelectorAll(
                ".nexus-desktop-icon"
            );


        icons.forEach((icon) => {

            const app =
                icon.dataset.app;


            if (!app) {
                return;
            }


            result[app] =
                this.getIconPosition(
                    icon
                );
        });


        return result;
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

        document.removeEventListener(
            "pointermove",
            this.handlePointerMove
        );


        document.removeEventListener(
            "pointerup",
            this.handlePointerUp
        );


        document.removeEventListener(
            "pointercancel",
            this.handlePointerUp
        );


        const icons =
            this.desktopIconContainer?.querySelectorAll(
                ".nexus-desktop-icon"
            );


        if (icons) {

            icons.forEach((icon) => {

                icon.removeEventListener(
                    "pointerdown",
                    this.handlePointerDown
                );


                icon.removeEventListener(
                    "click",
                    this.handleIconClick
                );


                icon.removeEventListener(
                    "dblclick",
                    this.handleIconDoubleClick
                );

            });
        }


        this.initialized =
            false;


        this.selectedIcon =
            null;


        this.dragState = {

            active: false,

            icon: null,

            pointerId: null,

            startX: 0,

            startY: 0,

            startLeft: 0,

            startTop: 0,

            moved: false
        };


        console.log(
            "Nexus Event Manager destroyed."
        );
    }
}


/* ================================================================
   GLOBAL EXPORT
================================================================ */

window.NexusEventManager =
    NexusEventManager;


/* ================================================================
   AUTO INITIALIZATION
================================================================ */

/*
 * Wait until the DOM is completely available.
 *
 * This makes desktop dragging work without requiring
 * an immediate modification to nexus.js.
 */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const eventManager =
            new NexusEventManager();


        eventManager.init();


        /*
         * Make it accessible globally.
         *
         * Later Nexus Core can use:
         *
         *     window.nexusEventManager
         */

        window.nexusEventManager =
            eventManager;

    }
);