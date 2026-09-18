/* ================================================================
   NEXUS BOOT MANAGER
   Module 1 - Core System

   Responsibilities:
   - Control Nexus boot sequence
   - Update boot progress
   - Update boot status
   - Complete system startup
   - Notify Nexus Core when boot is finished
================================================================ */


/* ================================================================
   NEXUS BOOT MANAGER CLASS
================================================================ */

class NexusBootManager {

    constructor(options = {}) {

        /* --------------------------------------------------------
           Configuration
        -------------------------------------------------------- */

        this.progressElement =
            options.progressElement ||
            document.getElementById("boot-progress");

        this.percentageElement =
            options.percentageElement ||
            document.getElementById("boot-percentage");

        this.statusElement =
            options.statusElement ||
            document.getElementById("boot-status");


        /* --------------------------------------------------------
           Boot State
        -------------------------------------------------------- */

        this.progress = 0;

        this.booting = false;

        this.completed = false;

        this.bootInterval = null;

        this.finishTimeout = null;


        /* --------------------------------------------------------
           Boot Configuration
        -------------------------------------------------------- */

        this.intervalTime =
            options.intervalTime || 120;

        this.finishDelay =
            options.finishDelay || 600;


        /* --------------------------------------------------------
           Boot Messages
        -------------------------------------------------------- */

        this.phases = [

            {
                progress: 20,
                status: "Initializing system"
            },

            {
                progress: 45,
                status: "Loading core modules"
            },

            {
                progress: 70,
                status: "Preparing workspace"
            },

            {
                progress: 90,
                status: "Starting Nexus"
            },

            {
                progress: 100,
                status: "System ready"
            }

        ];


        console.log(
            "Nexus Boot Manager created."
        );
    }


    /* ============================================================
       INITIALIZE
    ============================================================ */

    init() {

        this.progressElement =
            this.progressElement ||
            document.getElementById("boot-progress");


        this.percentageElement =
            this.percentageElement ||
            document.getElementById("boot-percentage");


        this.statusElement =
            this.statusElement ||
            document.getElementById("boot-status");


        this.reset();


        console.log(
            "Nexus Boot Manager initialized."
        );


        return true;
    }


    /* ============================================================
       START BOOT
    ============================================================ */

    start(onComplete = null) {

        if (this.booting) {

            return false;
        }


        if (this.completed) {

            if (typeof onComplete === "function") {

                onComplete();
            }

            return true;
        }


        this.booting = true;

        this.completed = false;

        this.progress = 0;


        this.clearTimers();

        this.updateProgress(0);

        this.updateStatus(
            "Initializing system"
        );


        let phaseIndex = 0;


        this.bootInterval =
            setInterval(() => {

                /* ------------------------------------------------
                   Random progress increment
                ------------------------------------------------ */

                const remaining =
                    100 - this.progress;


                /*
                 * Keep the progress animation natural.
                 * The final 100% is handled explicitly.
                 */

                if (remaining <= 0) {

                    this.complete(onComplete);

                    return;
                }


                const increment =
                    Math.min(
                        Math.floor(
                            Math.random() * 8
                        ) + 2,
                        remaining
                    );


                this.progress += increment;


                this.updateProgress(
                    this.progress
                );


                /* ------------------------------------------------
                   Update boot phase
                ------------------------------------------------ */

                while (
                    phaseIndex <
                    this.phases.length &&
                    this.progress >=
                    this.phases[phaseIndex].progress
                ) {

                    this.updateStatus(
                        this.phases[phaseIndex].status
                    );


                    phaseIndex++;
                }


                /* ------------------------------------------------
                   Complete boot
                ------------------------------------------------ */

                if (this.progress >= 100) {

                    this.progress = 100;

                    this.updateProgress(100);

                    this.updateStatus(
                        "System ready"
                    );


                    this.complete(
                        onComplete
                    );
                }

            }, this.intervalTime);


        return true;
    }


    /* ============================================================
       UPDATE PROGRESS
    ============================================================ */

    updateProgress(value) {

        const progress =
            Math.max(
                0,
                Math.min(
                    100,
                    Math.round(value)
                )
            );


        this.progress = progress;


        if (this.progressElement) {

            /*
             * Supports the current Nexus
             * boot progress element.
             */

            this.progressElement.style.width =
                `${progress}%`;
        }


        if (this.percentageElement) {

            this.percentageElement.textContent =
                `${progress}%`;
        }
    }


    /* ============================================================
       UPDATE STATUS
    ============================================================ */

    updateStatus(message) {

        if (!this.statusElement) {

            return;
        }


        this.statusElement.textContent =
            message || "";
    }


    /* ============================================================
       COMPLETE BOOT
    ============================================================ */

    complete(onComplete = null) {

        if (this.completed) {

            return;
        }


        this.clearBootInterval();


        this.progress = 100;

        this.updateProgress(100);

        this.updateStatus(
            "System ready"
        );


        this.finishTimeout =
            setTimeout(() => {

                this.booting = false;

                this.completed = true;


                /* ----------------------------------------------
                   Notify through Nexus Event Manager
                ---------------------------------------------- */

                this.emit(
                    "boot:complete",
                    {
                        progress: 100
                    }
                );


                /* ----------------------------------------------
                   Notify caller
                ---------------------------------------------- */

                if (
                    typeof onComplete ===
                    "function"
                ) {

                    onComplete();
                }


            }, this.finishDelay);
    }


    /* ============================================================
       RESET
    ============================================================ */

    reset() {

        this.clearTimers();


        this.progress = 0;

        this.booting = false;

        this.completed = false;


        this.updateProgress(0);

        this.updateStatus(
            "Initializing system"
        );
    }


    /* ============================================================
       STOP
    ============================================================ */

    stop() {

        this.clearTimers();


        this.booting = false;


        return true;
    }


    /* ============================================================
       CLEAR BOOT INTERVAL
    ============================================================ */

    clearBootInterval() {

        if (this.bootInterval !== null) {

            clearInterval(
                this.bootInterval
            );

            this.bootInterval = null;
        }
    }


    /* ============================================================
       CLEAR ALL TIMERS
    ============================================================ */

    clearTimers() {

        this.clearBootInterval();


        if (this.finishTimeout !== null) {

            clearTimeout(
                this.finishTimeout
            );

            this.finishTimeout = null;
        }
    }


    /* ============================================================
       GET BOOT STATUS
    ============================================================ */

    isBooting() {

        return this.booting;
    }


    isComplete() {

        return this.completed;
    }


    getProgress() {

        return this.progress;
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

        this.clearTimers();


        this.booting = false;

        this.completed = false;

        this.progress = 0;


        this.progressElement = null;

        this.percentageElement = null;

        this.statusElement = null;


        console.log(
            "Nexus Boot Manager destroyed."
        );
    }

}


/* ================================================================
   GLOBAL EXPORT
================================================================ */

window.NexusBootManager =
    NexusBootManager;


/* ================================================================
   GLOBAL INSTANCE
================================================================ */

window.nexusBootManager =
    new NexusBootManager();