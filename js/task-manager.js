/* ================================================================
   NEXUS TASK MANAGER APPLICATION
   Live Process & System Monitor for Nexus OS
================================================================ */

(function () {
    "use strict";

    if (window.NexusTaskManager) return;

    const CoreApp = window.nexusAppManager || null;
    if (!CoreApp) {
        console.error("Nexus Task Manager: Core App Manager not found.");
        return;
    }

    const APP_ID = "taskmanager";

    /* ----------------------------------------------------------------
       Default Process List Definitions
    ---------------------------------------------------------------- */
    const BASE_PROCESSES = [
        { id: "files", name: "File Manager", icon: "📁", baseCpu: 2.1, baseMem: 42, isSystem: false },
        { id: "browser", name: "Browser", icon: "🌐", baseCpu: 8.4, baseMem: 128, isSystem: false },
        { id: "terminal", name: "Terminal", icon: "💻", baseCpu: 0.4, baseMem: 18, isSystem: false },
        { id: "notes", name: "Notes", icon: "📝", baseCpu: 0.3, baseMem: 12, isSystem: false },
        { id: "calculator", name: "Calculator", icon: "🔢", baseCpu: 0.2, baseMem: 10, isSystem: false },
        { id: "settings", name: "Settings", icon: "⚙️", baseCpu: 0.8, baseMem: 24, isSystem: false },
        { id: "nexus_core", name: "Nexus System Core", icon: "⚡", baseCpu: 1.2, baseMem: 64, isSystem: true }
    ];

    /* ----------------------------------------------------------------
       Task Manager HTML Template
    ---------------------------------------------------------------- */
    function getTaskManagerHTML() {
        return `
        <div class="nexus-task-manager-app" id="nexus-task-manager-app">
            <!-- Telemetry Cards -->
            <div class="task-telemetry-bar">
                <div class="telemetry-card">
                    <div class="telemetry-label">
                        <span>CPU Usage</span>
                        <span id="task-telemetry-cpu-pct">11.4%</span>
                    </div>
                    <div class="telemetry-val" id="task-telemetry-cpu">11.4%</div>
                    <div class="telemetry-bar-bg">
                        <div class="telemetry-bar-fill" id="task-cpu-bar" style="width: 11%;"></div>
                    </div>
                </div>

                <div class="telemetry-card">
                    <div class="telemetry-label">
                        <span>Memory</span>
                        <span id="task-telemetry-mem-pct">298 MB</span>
                    </div>
                    <div class="telemetry-val" id="task-telemetry-mem">298 MB</div>
                    <div class="telemetry-bar-bg">
                        <div class="telemetry-bar-fill memory" id="task-mem-bar" style="width: 18%;"></div>
                    </div>
                </div>

                <div class="telemetry-card">
                    <div class="telemetry-label">
                        <span>Active Processes</span>
                        <span id="task-telemetry-active-pct">7</span>
                    </div>
                    <div class="telemetry-val" id="task-telemetry-active">7</div>
                    <div class="telemetry-bar-bg">
                        <div class="telemetry-bar-fill tasks" style="width: 70%;"></div>
                    </div>
                </div>
            </div>

            <!-- Toolbar -->
            <div class="task-table-toolbar">
                <input type="search" class="task-filter-input" id="task-search-input" placeholder="Filter processes..." autocomplete="off">
                <button type="button" class="task-btn-action" id="task-btn-end" disabled>
                    <span>✕ End Task</span>
                </button>
            </div>

            <!-- Table -->
            <div class="task-table-container">
                <table class="task-table">
                    <thead>
                        <tr>
                            <th style="width: 35%;">Process</th>
                            <th style="width: 18%;">CPU</th>
                            <th style="width: 20%;">Memory</th>
                            <th style="width: 17%;">Status</th>
                            <th style="width: 10%; text-align: right;">Action</th>
                        </tr>
                    </thead>
                    <tbody id="task-table-body">
                        <!-- Populated dynamically -->
                    </tbody>
                </table>
            </div>
        </div>
        `;
    }

    /* ----------------------------------------------------------------
       Task Manager Controller
    ---------------------------------------------------------------- */
    function initTaskManagerInstance(rootElement) {
        if (!rootElement) return;

        const tbody = rootElement.querySelector("#task-table-body");
        const searchInput = rootElement.querySelector("#task-search-input");
        const btnEndTask = rootElement.querySelector("#task-btn-end");
        const cpuTotalEl = rootElement.querySelector("#task-telemetry-cpu");
        const cpuPctEl = rootElement.querySelector("#task-telemetry-cpu-pct");
        const cpuBar = rootElement.querySelector("#task-cpu-bar");
        const memTotalEl = rootElement.querySelector("#task-telemetry-mem");
        const memPctEl = rootElement.querySelector("#task-telemetry-mem-pct");
        const memBar = rootElement.querySelector("#task-mem-bar");
        const activeTasksEl = rootElement.querySelector("#task-telemetry-active");
        const activeTasksPct = rootElement.querySelector("#task-telemetry-active-pct");

        let selectedProcessId = null;
        let updateInterval = null;

        // Clone process state
        let processes = BASE_PROCESSES.map(p => ({
            ...p,
            cpu: p.baseCpu,
            mem: p.baseMem,
            status: "Running"
        }));

        function isAppWindowOpen(appId) {
            if (!window.nexusWindowManager) return false;
            const win = window.nexusWindowManager.findByApp(appId);
            return !!(win && !win.closed);
        }

        function endProcess(procId) {
            const proc = processes.find(p => p.id === procId);
            if (!proc) return;

            if (proc.isSystem) {
                alert("Cannot terminate essential Nexus system processes.");
                return;
            }

            proc.status = "Terminated";
            proc.cpu = 0.0;

            // If an active window exists for this app, close it!
            if (window.nexusWindowManager) {
                const win = window.nexusWindowManager.findByApp(proc.id);
                if (win && !win.closed) {
                    window.nexusWindowManager.closeWindow(win.id);
                }
            }

            renderTable();
            updateTelemetry();
        }

        function renderTable() {
            const filter = (searchInput?.value || "").toLowerCase().trim();
            tbody.innerHTML = "";

            processes.forEach(proc => {
                if (filter && !proc.name.toLowerCase().includes(filter)) return;

                const tr = document.createElement("tr");
                tr.className = `task-row ${selectedProcessId === proc.id ? "selected" : ""}`;
                tr.dataset.procId = proc.id;

                const isTerminated = proc.status === "Terminated";
                const isRunning = !isTerminated;

                tr.innerHTML = `
                    <td>
                        <div class="task-proc-col">
                            <span class="task-proc-icon">${proc.icon}</span>
                            <span>${escapeHtml(proc.name)}</span>
                        </div>
                    </td>
                    <td class="task-cpu-col">${isTerminated ? "0.0%" : proc.cpu.toFixed(1) + "%"}</td>
                    <td class="task-mem-col">${isTerminated ? "0 MB" : Math.round(proc.mem) + " MB"}</td>
                    <td>
                        <span class="task-status-badge ${isTerminated ? "terminated" : "running"}">
                            ${proc.status}
                        </span>
                    </td>
                    <td style="text-align: right;">
                        ${!proc.isSystem && isRunning ? `<button type="button" class="task-btn-inline-end" data-proc-action="end">End</button>` : `<span style="color: #6c6d76; font-size: 11px;">-</span>`}
                    </td>
                `;

                tr.addEventListener("click", (e) => {
                    if (e.target.dataset.procAction === "end") {
                        endProcess(proc.id);
                        return;
                    }
                    selectedProcessId = proc.id;
                    updateSelectionUI();
                });

                tbody.appendChild(tr);
            });

            updateSelectionUI();
        }

        function updateSelectionUI() {
            const rows = tbody.querySelectorAll(".task-row");
            rows.forEach(r => {
                r.classList.toggle("selected", r.dataset.procId === selectedProcessId);
            });

            const sel = processes.find(p => p.id === selectedProcessId);
            if (sel && !sel.isSystem && sel.status !== "Terminated") {
                btnEndTask.disabled = false;
            } else {
                btnEndTask.disabled = true;
            }
        }

        function updateTelemetry() {
            let totalCpu = 0;
            let totalMem = 0;
            let activeCount = 0;

            processes.forEach(p => {
                if (p.status !== "Terminated") {
                    // Jitter slightly for realistic simulation
                    const jitterCpu = (Math.random() * 0.4 - 0.2);
                    p.cpu = Math.max(0.1, +(p.baseCpu + jitterCpu).toFixed(1));
                    totalCpu += p.cpu;
                    totalMem += p.mem;
                    activeCount++;
                }
            });

            totalCpu = +totalCpu.toFixed(1);
            totalMem = Math.round(totalMem);

            if (cpuTotalEl) cpuTotalEl.textContent = `${totalCpu}%`;
            if (cpuPctEl) cpuPctEl.textContent = `${totalCpu}%`;
            if (cpuBar) cpuBar.style.width = `${Math.min(100, totalCpu * 3)}%`;

            if (memTotalEl) memTotalEl.textContent = `${totalMem} MB`;
            if (memPctEl) memPctEl.textContent = `${totalMem} MB`;
            if (memBar) memBar.style.width = `${Math.min(100, Math.round((totalMem / 2048) * 100))}%`;

            if (activeTasksEl) activeTasksEl.textContent = activeCount;
            if (activeTasksPct) activeTasksPct.textContent = activeCount;

            // Also update the table cells smoothly without destroying DOM selection
            const rows = tbody.querySelectorAll(".task-row");
            rows.forEach(r => {
                const p = processes.find(proc => proc.id === r.dataset.procId);
                if (p && p.status !== "Terminated") {
                    const cpuCell = r.querySelector(".task-cpu-col");
                    const memCell = r.querySelector(".task-mem-col");
                    if (cpuCell) cpuCell.textContent = `${p.cpu.toFixed(1)}%`;
                    if (memCell) memCell.textContent = `${Math.round(p.mem)} MB`;
                }
            });
        }

        searchInput?.addEventListener("input", renderTable);

        btnEndTask?.addEventListener("click", () => {
            if (selectedProcessId) {
                endProcess(selectedProcessId);
            }
        });

        // Initial render
        renderTable();
        updateTelemetry();

        // Refresh loop every 2 seconds
        updateInterval = setInterval(updateTelemetry, 2000);

        // Clean up timer when window is closed
        const winEl = rootElement.closest(".nexus-window");
        if (winEl) {
            const winId = winEl.dataset.windowId;
            const closeHandler = (e) => {
                if (e.detail && e.detail.id === winId) {
                    clearInterval(updateInterval);
                    document.removeEventListener("nexus:window:closed", closeHandler);
                }
            };
            document.addEventListener("nexus:window:closed", closeHandler);
        }
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
        title: "Task Manager",
        width: 720,
        height: 500,
        content: () => getTaskManagerHTML()
    });

    /* ----------------------------------------------------------------
       Window Creation Hook
    ---------------------------------------------------------------- */
    document.addEventListener("nexus:window:created", (event) => {
        const win = event.detail;
        if (!win || win.appId !== APP_ID) return;
        const taskRoot = win.element.querySelector("#nexus-task-manager-app");
        if (taskRoot) {
            initTaskManagerInstance(taskRoot);
        }
    });

    window.NexusTaskManager = {
        open() {
            window.Nexus?.openApplication(APP_ID);
        }
    };

    console.log("Nexus Task Manager Module loaded.");
})();
