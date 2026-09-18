/* ================================================================
   NEXUS WINDOW MANAGER
   Module 1 - Core System

   Responsibilities:
   - Create application windows
   - Destroy application windows
   - Focus windows
   - Drag windows
   - Resize windows
   - Minimize windows
   - Maximize windows
   - Restore windows
   - Manage z-index
   - Track window state
================================================================ */


/* ================================================================
   NEXUS WINDOW MANAGER CLASS
================================================================ */

class NexusWindowManager {

    constructor(options = {}) {

        /* --------------------------------------------------------
           Configuration
        -------------------------------------------------------- */

        this.container =
            options.container ||
            document.getElementById("window-layer");


        this.minWidth =
            options.minWidth || 320;


        this.minHeight =
            options.minHeight || 220;


        this.defaultWidth =
            options.defaultWidth || 720;


        this.defaultHeight =
            options.defaultHeight || 480;


        /* --------------------------------------------------------
           Window State
        -------------------------------------------------------- */

        this.windows = new Map();

        this.activeWindowId = null;

        this.nextWindowId = 1;

        this.zIndex = 500;


        /* --------------------------------------------------------
           Drag State
        -------------------------------------------------------- */

        this.dragState = {

            active: false,

            windowId: null,

            startX: 0,

            startY: 0,

            startLeft: 0,

            startTop: 0

        };


        /* --------------------------------------------------------
           Resize State
        -------------------------------------------------------- */

        this.resizeState = {

            active: false,

            windowId: null,

            direction: null,

            startX: 0,

            startY: 0,

            startWidth: 0,

            startHeight: 0,

            startLeft: 0,

            startTop: 0

        };


        /* --------------------------------------------------------
           Bind Global Events
        -------------------------------------------------------- */

        this.bindGlobalEvents();


        console.log(
            "Nexus Window Manager initialized."
        );

    }



    /* ============================================================
       CREATE WINDOW
    ============================================================ */

    createWindow(options = {}) {

        if (!this.container) {

            console.error(
                "Nexus Window Manager: #window-layer not found."
            );

            return null;

        }


        /* --------------------------------------------------------
           Window Configuration
        -------------------------------------------------------- */

        const id =
            options.id ||
            `nexus-window-${this.nextWindowId++}`;


        /*
         * If a window with the same application already exists,
         * focus it instead of creating a duplicate.
         */

        if (
            options.singleInstance &&
            options.appId
        ) {

            const existing =
                this.findByApp(
                    options.appId
                );


            if (existing) {

                this.focusWindow(
                    existing.id
                );

                return existing;

            }

        }


        const title =
            options.title ||
            "Nexus Application";


        const width =
            options.width ||
            this.defaultWidth;


        const height =
            options.height ||
            this.defaultHeight;


        /* --------------------------------------------------------
           Position
        -------------------------------------------------------- */

        const position =
            this.calculateInitialPosition(
                width,
                height
            );


        /* --------------------------------------------------------
           Create Window Element
        -------------------------------------------------------- */

        const windowElement =
            document.createElement("div");


        windowElement.className =
            "nexus-window";


        windowElement.dataset.windowId =
            id;


        if (options.appId) {

            windowElement.dataset.appId =
                options.appId;

        }


        windowElement.style.width =
            `${width}px`;


        windowElement.style.height =
            `${height}px`;


        windowElement.style.left =
            `${position.left}px`;


        windowElement.style.top =
            `${position.top}px`;


        windowElement.style.zIndex =
            ++this.zIndex;



        /* --------------------------------------------------------
           Window HTML
        -------------------------------------------------------- */

        windowElement.innerHTML = `

            <div class="window-titlebar">

                <div class="window-controls">

                    <button
                        type="button"
                        class="window-control window-close"
                        data-action="close"
                        aria-label="Close window"
                        title="Close"
                    ></button>

                    <button
                        type="button"
                        class="window-control window-minimize"
                        data-action="minimize"
                        aria-label="Minimize window"
                        title="Minimize"
                    ></button>

                    <button
                        type="button"
                        class="window-control window-maximize"
                        data-action="maximize"
                        aria-label="Maximize window"
                        title="Maximize"
                    ></button>

                </div>


                <div class="window-title">
                    ${this.escapeHtml(title)}
                </div>


                <div class="window-title-spacer"></div>

            </div>


            <div class="window-content">

                ${options.content ||
            this.defaultContent(title)
            }

            </div>


            <!-- Resize Handles -->

            <div
                class="window-resize-handle resize-n"
                data-resize="n"
            ></div>

            <div
                class="window-resize-handle resize-e"
                data-resize="e"
            ></div>

            <div
                class="window-resize-handle resize-s"
                data-resize="s"
            ></div>

            <div
                class="window-resize-handle resize-w"
                data-resize="w"
            ></div>

            <div
                class="window-resize-handle resize-ne"
                data-resize="ne"
            ></div>

            <div
                class="window-resize-handle resize-se"
                data-resize="se"
            ></div>

            <div
                class="window-resize-handle resize-sw"
                data-resize="sw"
            ></div>

            <div
                class="window-resize-handle resize-nw"
                data-resize="nw"
            ></div>

        `;


        /* --------------------------------------------------------
           Add To DOM
        -------------------------------------------------------- */

        this.container.appendChild(
            windowElement
        );


        /* --------------------------------------------------------
           Window State Object
        -------------------------------------------------------- */

        const windowState = {

            id: id,

            appId:
                options.appId || null,

            title: title,

            element:
                windowElement,

            width: width,

            height: height,

            left: position.left,

            top: position.top,

            minWidth:
                options.minWidth ||
                this.minWidth,

            minHeight:
                options.minHeight ||
                this.minHeight,

            maximized: false,

            minimized: false,

            closed: false,

            previousState: null,

            zIndex:
                this.zIndex,

            createdAt:
                new Date().toISOString()

        };


        /* --------------------------------------------------------
           Store State
        -------------------------------------------------------- */

        this.windows.set(
            id,
            windowState
        );


        /* --------------------------------------------------------
           Bind Window Events
        -------------------------------------------------------- */

        this.bindWindowEvents(
            windowState
        );


        /* --------------------------------------------------------
           Focus New Window
        -------------------------------------------------------- */

        this.focusWindow(id);


        /* --------------------------------------------------------
           Event
        -------------------------------------------------------- */

        this.emit(
            "window:created",
            windowState
        );


        return windowState;

    }



    /* ============================================================
       DEFAULT WINDOW CONTENT
    ============================================================ */

    defaultContent(title) {

        return `

            <div
                style="
                    width:100%;
                    height:100%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    flex-direction:column;
                    gap:10px;
                    color:var(--nexus-text-muted);
                    text-align:center;
                    padding:30px;
                "
            >

                <strong
                    style="
                        color:var(--nexus-text);
                        font-size:18px;
                        font-weight:600;
                    "
                >
                    ${this.escapeHtml(title)}
                </strong>

                <span
                    style="
                        font-size:12px;
                    "
                >
                    Application window is ready.
                </span>

            </div>

        `;

    }



    /* ============================================================
       BIND WINDOW EVENTS
    ============================================================ */

    bindWindowEvents(windowState) {

        const element =
            windowState.element;


        /* --------------------------------------------------------
           Focus
        -------------------------------------------------------- */

        element.addEventListener(
            "pointerdown",
            () => {

                this.focusWindow(
                    windowState.id
                );

            }
        );


        /* --------------------------------------------------------
           Title Bar
        -------------------------------------------------------- */

        const titlebar =
            element.querySelector(
                ".window-titlebar"
            );


        if (titlebar) {

            titlebar.addEventListener(
                "pointerdown",
                (event) => {

                    /*
                     * Do not drag when clicking
                     * window control buttons.
                     */

                    if (
                        event.target.closest(
                            ".window-control"
                        )
                    ) {

                        return;

                    }


                    /*
                     * Do not drag while maximized.
                     */

                    if (
                        windowState.maximized
                    ) {

                        return;

                    }


                    this.startDrag(
                        event,
                        windowState.id
                    );

                }
            );


            /* Double click = maximize/restore */

            titlebar.addEventListener(
                "dblclick",
                (event) => {

                    if (
                        event.target.closest(
                            ".window-control"
                        )
                    ) {

                        return;

                    }


                    this.toggleMaximize(
                        windowState.id
                    );

                }
            );

        }



        /* --------------------------------------------------------
           Close
        -------------------------------------------------------- */

        const closeButton =
            element.querySelector(
                '[data-action="close"]'
            );


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                (event) => {

                    event.stopPropagation();

                    this.closeWindow(
                        windowState.id
                    );

                }
            );

        }



        /* --------------------------------------------------------
           Minimize
        -------------------------------------------------------- */

        const minimizeButton =
            element.querySelector(
                '[data-action="minimize"]'
            );


        if (minimizeButton) {

            minimizeButton.addEventListener(
                "click",
                (event) => {

                    event.stopPropagation();

                    this.minimizeWindow(
                        windowState.id
                    );

                }
            );

        }



        /* --------------------------------------------------------
           Maximize
        -------------------------------------------------------- */

        const maximizeButton =
            element.querySelector(
                '[data-action="maximize"]'
            );


        if (maximizeButton) {

            maximizeButton.addEventListener(
                "click",
                (event) => {

                    event.stopPropagation();

                    this.toggleMaximize(
                        windowState.id
                    );

                }
            );

        }



        /* --------------------------------------------------------
           Resize Handles
        -------------------------------------------------------- */

        const resizeHandles =
            element.querySelectorAll(
                ".window-resize-handle"
            );


        resizeHandles.forEach(
            (handle) => {

                handle.addEventListener(
                    "pointerdown",
                    (event) => {

                        event.preventDefault();

                        event.stopPropagation();


                        const direction =
                            handle.dataset.resize;


                        this.startResize(
                            event,
                            windowState.id,
                            direction
                        );

                    }
                );

            }
        );

    }



    /* ============================================================
       FOCUS WINDOW
    ============================================================ */

    focusWindow(windowId) {

        const windowState =
            this.windows.get(
                windowId
            );


        if (!windowState) {

            return;

        }


        if (windowState.closed) {

            return;

        }


        if (windowState.minimized) {

            this.restoreWindow(
                windowId
            );

        }


        /* --------------------------------------------------------
           Increase Z Index
        -------------------------------------------------------- */

        this.zIndex++;

        windowState.zIndex =
            this.zIndex;


        windowState.element.style.zIndex =
            this.zIndex;


        /* --------------------------------------------------------
           Active Classes
        -------------------------------------------------------- */

        this.windows.forEach(
            (item) => {

                item.element.classList.remove(
                    "active"
                );

            }
        );


        windowState.element.classList.add(
            "active"
        );


        this.activeWindowId =
            windowId;


        /* --------------------------------------------------------
           Event
        -------------------------------------------------------- */

        this.emit(
            "window:focused",
            windowState
        );

    }



    /* ============================================================
       CLOSE WINDOW
    ============================================================ */

    closeWindow(windowId) {

        const windowState =
            this.windows.get(
                windowId
            );


        if (!windowState) {

            return false;

        }


        windowState.closed = true;


        /* --------------------------------------------------------
           Remove Element
        -------------------------------------------------------- */

        if (
            windowState.element &&
            windowState.element.parentNode
        ) {

            windowState.element.remove();

        }


        /* --------------------------------------------------------
           Remove State
        -------------------------------------------------------- */

        this.windows.delete(
            windowId
        );


        /* --------------------------------------------------------
           Update Active Window
        -------------------------------------------------------- */

        if (
            this.activeWindowId ===
            windowId
        ) {

            this.activeWindowId =
                null;


            this.focusTopWindow();

        }


        /* --------------------------------------------------------
           Event
        -------------------------------------------------------- */

        this.emit(
            "window:closed",
            windowState
        );


        return true;

    }



    /* ============================================================
       MINIMIZE WINDOW
    ============================================================ */

    minimizeWindow(windowId) {

        const windowState =
            this.windows.get(
                windowId
            );


        if (!windowState) {

            return false;

        }


        if (windowState.minimized) {

            return false;

        }


        windowState.minimized =
            true;


        windowState.element.classList.add(
            "minimized"
        );


        windowState.element.style.pointerEvents =
            "none";


        if (
            this.activeWindowId ===
            windowId
        ) {

            this.activeWindowId =
                null;


            this.focusTopWindow();

        }


        this.emit(
            "window:minimized",
            windowState
        );


        return true;

    }



    /* ============================================================
       RESTORE WINDOW
    ============================================================ */

    restoreWindow(windowId) {

        const windowState =
            this.windows.get(
                windowId
            );


        if (!windowState) {

            return false;

        }


        /* --------------------------------------------------------
           If maximized, restore previous geometry
        -------------------------------------------------------- */

        if (
            windowState.maximized
        ) {

            this.restoreFromMaximize(
                windowState
            );

        }


        windowState.minimized =
            false;


        windowState.closed =
            false;


        windowState.element.classList.remove(
            "minimized"
        );


        windowState.element.style.pointerEvents =
            "auto";


        this.focusWindow(
            windowId
        );


        this.emit(
            "window:restored",
            windowState
        );


        return true;

    }



    /* ============================================================
       TOGGLE MAXIMIZE
    ============================================================ */

    toggleMaximize(windowId) {

        const windowState =
            this.windows.get(
                windowId
            );


        if (!windowState) {

            return false;

        }


        if (
            windowState.maximized
        ) {

            return this.restoreFromMaximize(
                windowState
            );

        }


        return this.maximizeWindow(
            windowId
        );

    }



    /* ============================================================
       MAXIMIZE WINDOW
    ============================================================ */

    maximizeWindow(windowId) {

        const windowState =
            this.windows.get(
                windowId
            );


        if (!windowState) {

            return false;

        }


        if (
            windowState.maximized
        ) {

            return false;

        }


        /* --------------------------------------------------------
           Save Current Geometry
        -------------------------------------------------------- */

        windowState.previousState = {

            left:
                windowState.element.offsetLeft,

            top:
                windowState.element.offsetTop,

            width:
                windowState.element.offsetWidth,

            height:
                windowState.element.offsetHeight

        };


        /* --------------------------------------------------------
           Calculate Available Area
        -------------------------------------------------------- */

        const bounds =
            this.getContainerBounds();


        /* --------------------------------------------------------
           Apply Full Workspace
        -------------------------------------------------------- */

        windowState.element.style.left =
            `${bounds.left}px`;


        windowState.element.style.top =
            `${bounds.top}px`;


        windowState.element.style.width =
            `${bounds.width}px`;


        windowState.element.style.height =
            `${bounds.height}px`;


        windowState.maximized =
            true;


        windowState.left =
            bounds.left;


        windowState.top =
            bounds.top;


        windowState.width =
            bounds.width;


        windowState.height =
            bounds.height;


        windowState.element.classList.add(
            "maximized"
        );


        this.focusWindow(
            windowId
        );


        this.emit(
            "window:maximized",
            windowState
        );


        return true;

    }



    /* ============================================================
       RESTORE FROM MAXIMIZE
    ============================================================ */

    restoreFromMaximize(windowState) {

        if (
            !windowState.previousState
        ) {

            return false;

        }


        const previous =
            windowState.previousState;


        windowState.element.style.left =
            `${previous.left}px`;


        windowState.element.style.top =
            `${previous.top}px`;


        windowState.element.style.width =
            `${previous.width}px`;


        windowState.element.style.height =
            `${previous.height}px`;


        windowState.left =
            previous.left;


        windowState.top =
            previous.top;


        windowState.width =
            previous.width;


        windowState.height =
            previous.height;


        windowState.maximized =
            false;


        windowState.previousState =
            null;


        windowState.element.classList.remove(
            "maximized"
        );


        this.focusWindow(
            windowState.id
        );


        this.emit(
            "window:restored",
            windowState
        );


        return true;

    }



    /* ============================================================
       START DRAG
    ============================================================ */

    startDrag(event, windowId) {

        const windowState =
            this.windows.get(windowId);

        if (!windowState) {
            return;
        }

        if (
            windowState.maximized ||
            windowState.minimized
        ) {
            return;
        }

        /* Ignore non-primary mouse buttons */
        if (
            event.pointerType === "mouse" &&
            event.button !== 0
        ) {
            return;
        }

        event.preventDefault();

        this.focusWindow(windowId);

        this.dragState = {
            active: true,
            windowId: windowId,
            startX: event.clientX,
            startY: event.clientY,
            startLeft:
                windowState.element.offsetLeft,
            startTop:
                windowState.element.offsetTop
        };

        try {

            event.currentTarget.setPointerCapture(
                event.pointerId
            );

        } catch (error) {

            console.warn(
                "Pointer capture unavailable.",
                error
            );
        }

        document.body.classList.add(
            "nexus-window-dragging"
        );
    }


    /* ============================================================
       HANDLE DRAG
    ============================================================ */

    handleDrag(event) {

        if (!this.dragState.active) {
            return;
        }

        const state =
            this.dragState;

        const windowState =
            this.windows.get(
                state.windowId
            );

        if (!windowState) {
            this.stopDrag();
            return;
        }

        if (
            windowState.maximized ||
            windowState.minimized
        ) {
            this.stopDrag();
            return;
        }

        const deltaX =
            event.clientX -
            state.startX;

        const deltaY =
            event.clientY -
            state.startY;

        let newLeft =
            state.startLeft +
            deltaX;

        let newTop =
            state.startTop +
            deltaY;

        const bounds =
            this.getContainerBounds();

        const visibleWidth = 80;
        const visibleHeight = 30;

        const minLeft =
            -windowState.width +
            visibleWidth;

        const maxLeft =
            bounds.width -
            visibleWidth;

        const minTop = 0;

        const maxTop =
            bounds.height -
            visibleHeight;

        newLeft =
            Math.max(
                minLeft,
                Math.min(
                    newLeft,
                    maxLeft
                )
            );

        newTop =
            Math.max(
                minTop,
                Math.min(
                    newTop,
                    maxTop
                )
            );

        windowState.element.style.left =
            `${newLeft}px`;

        windowState.element.style.top =
            `${newTop}px`;

        windowState.left =
            newLeft;

        windowState.top =
            newTop;
    }


    /* ============================================================
       START RESIZE
    ============================================================ */

    startResize(
        event,
        windowId,
        direction
    ) {

        const windowState =
            this.windows.get(
                windowId
            );


        if (!windowState) {

            return;

        }


        if (
            windowState.maximized ||
            windowState.minimized
        ) {

            return;

        }


        this.focusWindow(
            windowId
        );


        this.resizeState = {

            active: true,

            windowId: windowId,

            direction: direction,

            startX: event.clientX,

            startY: event.clientY,

            startWidth:
                windowState.element.offsetWidth,

            startHeight:
                windowState.element.offsetHeight,

            startLeft:
                windowState.element.offsetLeft,

            startTop:
                windowState.element.offsetTop

        };

    }



    /* ============================================================
       HANDLE RESIZE
    ============================================================ */

    handleResize(event) {

        if (
            !this.resizeState.active
        ) {

            return;

        }


        const state =
            this.resizeState;


        const windowState =
            this.windows.get(
                state.windowId
            );


        if (!windowState) {

            this.stopResize();

            return;

        }


        const deltaX =
            event.clientX -
            state.startX;


        const deltaY =
            event.clientY -
            state.startY;


        let width =
            state.startWidth;


        let height =
            state.startHeight;


        let left =
            state.startLeft;


        let top =
            state.startTop;


        const direction =
            state.direction;


        /* --------------------------------------------------------
           East
        -------------------------------------------------------- */

        if (
            direction.includes("e")
        ) {

            width =
                state.startWidth +
                deltaX;

        }


        /* --------------------------------------------------------
           West
        -------------------------------------------------------- */

        if (
            direction.includes("w")
        ) {

            width =
                state.startWidth -
                deltaX;


            left =
                state.startLeft +
                deltaX;

        }


        /* --------------------------------------------------------
           South
        -------------------------------------------------------- */

        if (
            direction.includes("s")
        ) {

            height =
                state.startHeight +
                deltaY;

        }


        /* --------------------------------------------------------
           North
        -------------------------------------------------------- */

        if (
            direction.includes("n")
        ) {

            height =
                state.startHeight -
                deltaY;


            top =
                state.startTop +
                deltaY;

        }


        /* --------------------------------------------------------
           Minimum Size
        -------------------------------------------------------- */

        if (
            width <
            windowState.minWidth
        ) {

            if (
                direction.includes("w")
            ) {

                left =
                    state.startLeft +
                    state.startWidth -
                    windowState.minWidth;

            }


            width =
                windowState.minWidth;

        }


        if (
            height <
            windowState.minHeight
        ) {

            if (
                direction.includes("n")
            ) {

                top =
                    state.startTop +
                    state.startHeight -
                    windowState.minHeight;

            }


            height =
                windowState.minHeight;

        }


        /* --------------------------------------------------------
           Apply Size
        -------------------------------------------------------- */

        windowState.element.style.width =
            `${width}px`;


        windowState.element.style.height =
            `${height}px`;


        windowState.element.style.left =
            `${left}px`;


        windowState.element.style.top =
            `${top}px`;


        /* --------------------------------------------------------
           Update State
        -------------------------------------------------------- */

        windowState.width =
            width;


        windowState.height =
            height;


        windowState.left =
            left;


        windowState.top =
            top;

    }



    /* ============================================================
       STOP RESIZE
    ============================================================ */

    stopResize() {

        this.resizeState.active =
            false;

        this.resizeState.windowId =
            null;

        this.resizeState.direction =
            null;

    }



    /* ============================================================
       GET CONTAINER BOUNDS
    ============================================================ */

    getContainerBounds() {

        const rect =
            this.container.getBoundingClientRect();


        return {

            left: 0,

            top: 0,

            width: rect.width,

            height: rect.height

        };

    }



    /* ============================================================
       INITIAL WINDOW POSITION
    ============================================================ */

    calculateInitialPosition(
        width,
        height
    ) {

        const bounds =
            this.getContainerBounds();


        /*
         * Slight cascading effect for
         * multiple application windows.
         */

        const index =
            this.windows.size;


        const offset =
            (index % 6) * 28;


        let left =
            (bounds.width - width) / 2 +
            offset;


        let top =
            (bounds.height - height) / 2 +
            offset;


        /* Keep window inside workspace */

        const maxLeft =
            Math.max(
                20,
                bounds.width - width - 20
            );


        const maxTop =
            Math.max(
                20,
                bounds.height - height - 20
            );


        left =
            Math.max(
                20,
                Math.min(
                    left,
                    maxLeft
                )
            );


        top =
            Math.max(
                20,
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
       FIND WINDOW BY ID
    ============================================================ */

    getWindow(windowId) {

        return this.windows.get(
            windowId
        ) || null;

    }



    /* ============================================================
       FIND WINDOW BY APPLICATION
    ============================================================ */

    findByApp(appId) {

        for (
            const windowState
            of this.windows.values()
        ) {

            if (
                windowState.appId ===
                appId &&
                !windowState.closed
            ) {

                return windowState;

            }

        }


        return null;

    }



    /* ============================================================
       GET ACTIVE WINDOW
    ============================================================ */

    getActiveWindow() {

        if (
            !this.activeWindowId
        ) {

            return null;

        }


        return this.getWindow(
            this.activeWindowId
        );

    }



    /* ============================================================
       GET ALL WINDOWS
    ============================================================ */

    getAllWindows() {

        return Array.from(
            this.windows.values()
        );

    }



    /* ============================================================
       FOCUS TOP WINDOW
    ============================================================ */

    focusTopWindow() {

        const windows =
            this.getAllWindows()
                .filter(
                    item =>
                        !item.closed &&
                        !item.minimized
                );


        if (
            windows.length === 0
        ) {

            this.activeWindowId =
                null;

            return;

        }


        windows.sort(
            (a, b) =>
                b.zIndex -
                a.zIndex
        );


        this.focusWindow(
            windows[0].id
        );

    }



    /* ============================================================
       CLOSE ALL WINDOWS
    ============================================================ */

    closeAll() {

        const ids =
            Array.from(
                this.windows.keys()
            );


        ids.forEach(
            id => {

                this.closeWindow(
                    id
                );

            }
        );

    }



    /* ============================================================
       MINIMIZE ALL WINDOWS
    ============================================================ */

    minimizeAll() {

        this.windows.forEach(
            (windowState) => {

                if (
                    !windowState.minimized &&
                    !windowState.closed
                ) {

                    this.minimizeWindow(
                        windowState.id
                    );

                }

            }
        );

    }



    /* ============================================================
       RESIZE ALL WINDOWS AFTER SCREEN CHANGE
    ============================================================ */

    handleContainerResize() {

        const bounds =
            this.getContainerBounds();


        this.windows.forEach(
            (windowState) => {

                if (
                    windowState.maximized
                ) {

                    windowState.element.style.width =
                        `${bounds.width}px`;

                    windowState.element.style.height =
                        `${bounds.height}px`;

                }

            }
        );

    }

    stopDrag() {

    if (!this.dragState.active) {
        return;
    }

    this.dragState.active =
        false;

    this.dragState.windowId =
        null;

    document.body.classList.remove(
        "nexus-window-dragging"
    );
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
            (event) => {

                if (
                    this.dragState.active
                ) {

                    this.handleDrag(
                        event
                    );

                }


                if (
                    this.resizeState.active
                ) {

                    this.handleResize(
                        event
                    );

                }

            }
        );


        /* --------------------------------------------------------
           Pointer Up
        -------------------------------------------------------- */

        document.addEventListener(
            "pointerup",
            () => {

                this.stopDrag();

                this.stopResize();

            }
        );


        /* --------------------------------------------------------
           Window Resize
        -------------------------------------------------------- */

        window.addEventListener(
            "resize",
            () => {

                this.handleContainerResize();

            }
        );

    }



    /* ============================================================
       ESCAPE
    ============================================================ */

    handleEscape() {

        /*
         * Escape does not close the application.
         * It simply removes active state.
         */

        const active =
            this.getActiveWindow();


        if (active) {

            active.element.classList.remove(
                "active"
            );

        }

    }



    /* ============================================================
       EVENT SYSTEM
    ============================================================ */

    emit(
        eventName,
        detail
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

}


/* ================================================================
   GLOBAL EXPORT
================================================================ */

window.NexusWindowManager =
    NexusWindowManager;