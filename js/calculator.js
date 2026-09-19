/* ================================================================
   NEXUS CALCULATOR APPLICATION
   Modular Calculator for Nexus OS
================================================================ */

(function () {
    "use strict";

    if (window.NexusCalculator) return;

    const CoreApp = window.nexusAppManager || null;
    if (!CoreApp) {
        console.error("Nexus Calculator: Core App Manager not found.");
        return;
    }

    const APP_ID = "calculator";
    const STORAGE_KEY = "nexus_calc_history";

    /* ----------------------------------------------------------------
       Calculator HTML Template
    ---------------------------------------------------------------- */
    function getCalculatorHTML() {
        return `
        <div class="nexus-calculator-app" id="nexus-calculator-app">
            <!-- Header -->
            <div class="calc-header">
                <span class="calc-mode-title">Standard</span>
                <button type="button" class="calc-btn-history-toggle" id="calc-toggle-history" title="Toggle Calculation History">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>History</span>
                </button>
            </div>

            <!-- Display -->
            <div class="calc-display-panel">
                <div class="calc-secondary-expression" id="calc-secondary">&nbsp;</div>
                <div class="calc-primary-display" id="calc-display">0</div>
            </div>

            <!-- Keypad & History Drawer -->
            <div class="calc-body-wrapper">
                <div class="calc-keypad" id="calc-keypad">
                    <!-- Row 1: Function Keys -->
                    <button type="button" class="calc-key key-fn" data-action="clear" title="Clear">C</button>
                    <button type="button" class="calc-key key-fn" data-action="negate" title="Negate">±</button>
                    <button type="button" class="calc-key key-fn" data-action="percent" title="Percent">%</button>
                    <button type="button" class="calc-key key-op" data-action="op" data-value="/" title="Divide">÷</button>

                    <!-- Row 2 -->
                    <button type="button" class="calc-key" data-action="num" data-value="7">7</button>
                    <button type="button" class="calc-key" data-action="num" data-value="8">8</button>
                    <button type="button" class="calc-key" data-action="num" data-value="9">9</button>
                    <button type="button" class="calc-key key-op" data-action="op" data-value="*" title="Multiply">×</button>

                    <!-- Row 3 -->
                    <button type="button" class="calc-key" data-action="num" data-value="4">4</button>
                    <button type="button" class="calc-key" data-action="num" data-value="5">5</button>
                    <button type="button" class="calc-key" data-action="num" data-value="6">6</button>
                    <button type="button" class="calc-key key-op" data-action="op" data-value="-" title="Subtract">−</button>

                    <!-- Row 4 -->
                    <button type="button" class="calc-key" data-action="num" data-value="1">1</button>
                    <button type="button" class="calc-key" data-action="num" data-value="2">2</button>
                    <button type="button" class="calc-key" data-action="num" data-value="3">3</button>
                    <button type="button" class="calc-key key-op" data-action="op" data-value="+" title="Add">+</button>

                    <!-- Row 5 -->
                    <button type="button" class="calc-key" data-action="num" data-value="0">0</button>
                    <button type="button" class="calc-key" data-action="decimal">.</button>
                    <button type="button" class="calc-key key-fn" data-action="backspace" title="Backspace">⌫</button>
                    <button type="button" class="calc-key key-equals" data-action="equals" title="Calculate">=</button>
                </div>

                <!-- History Drawer -->
                <div class="calc-history-panel" id="calc-history-panel">
                    <div class="calc-history-header">
                        <h4>History</h4>
                        <button type="button" class="calc-btn-clear-history" id="calc-clear-history">Clear</button>
                    </div>
                    <div class="calc-history-list" id="calc-history-list">
                        <div class="calc-history-empty">There's no history yet.</div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    /* ----------------------------------------------------------------
       History Helper
    ---------------------------------------------------------------- */
    function loadHistory() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
    }

    function saveHistory(history) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
        } catch (e) {}
    }

    /* ----------------------------------------------------------------
       Calculator Instance Controller
    ---------------------------------------------------------------- */
    function initCalculatorInstance(rootElement) {
        if (!rootElement) return;

        const displayEl = rootElement.querySelector("#calc-display");
        const secondaryEl = rootElement.querySelector("#calc-secondary");
        const keypad = rootElement.querySelector("#calc-keypad");
        const historyPanel = rootElement.querySelector("#calc-history-panel");
        const historyToggleBtn = rootElement.querySelector("#calc-toggle-history");
        const historyListEl = rootElement.querySelector("#calc-history-list");
        const clearHistoryBtn = rootElement.querySelector("#calc-clear-history");

        let currentVal = "0";
        let previousVal = null;
        let operation = null;
        let resetNext = false;
        let history = loadHistory();

        renderHistory();

        function updateDisplay() {
            displayEl.textContent = currentVal;
            if (previousVal !== null && operation) {
                const opSymbol = operation === "*" ? "×" : operation === "/" ? "÷" : operation;
                secondaryEl.textContent = `${previousVal} ${opSymbol}`;
            } else {
                secondaryEl.innerHTML = "&nbsp;";
            }
        }

        function handleNumber(num) {
            if (resetNext) {
                currentVal = num;
                resetNext = false;
            } else {
                if (currentVal === "0") {
                    currentVal = num;
                } else if (currentVal.length < 14) {
                    currentVal += num;
                }
            }
            updateDisplay();
        }

        function handleDecimal() {
            if (resetNext) {
                currentVal = "0.";
                resetNext = false;
            } else if (!currentVal.includes(".")) {
                currentVal += ".";
            }
            updateDisplay();
        }

        function handleOperation(op) {
            const num = parseFloat(currentVal);
            if (previousVal === null) {
                previousVal = num;
            } else if (operation && !resetNext) {
                const result = calculate(previousVal, num, operation);
                previousVal = result;
                currentVal = String(result);
            }
            operation = op;
            resetNext = true;
            updateDisplay();
        }

        function calculate(a, b, op) {
            let res = 0;
            switch (op) {
                case "+": res = a + b; break;
                case "-": res = a - b; break;
                case "*": res = a * b; break;
                case "/": res = b !== 0 ? a / b : "Error"; break;
            }
            if (typeof res === "number") {
                // Round to max 9 decimals to prevent floating point inaccuracies
                return parseFloat(res.toFixed(9));
            }
            return res;
        }

        function handleEquals() {
            if (previousVal === null || operation === null) return;
            const b = parseFloat(currentVal);
            const a = previousVal;
            const op = operation;
            const opSymbol = op === "*" ? "×" : op === "/" ? "÷" : op;
            const result = calculate(a, b, op);

            const equationStr = `${a} ${opSymbol} ${b} =`;
            secondaryEl.textContent = equationStr;
            currentVal = String(result);

            // Save to history
            history.unshift({
                expr: equationStr,
                result: currentVal
            });
            saveHistory(history);
            renderHistory();

            previousVal = null;
            operation = null;
            resetNext = true;
            displayEl.textContent = currentVal;
        }

        function handleClear() {
            currentVal = "0";
            previousVal = null;
            operation = null;
            resetNext = false;
            updateDisplay();
        }

        function handleBackspace() {
            if (resetNext) return;
            if (currentVal.length > 1) {
                currentVal = currentVal.slice(0, -1);
            } else {
                currentVal = "0";
            }
            updateDisplay();
        }

        function handlePercent() {
            const num = parseFloat(currentVal);
            if (previousVal !== null) {
                // e.g. 50 + 10% = 55
                currentVal = String(previousVal * (num / 100));
            } else {
                currentVal = String(num / 100);
            }
            updateDisplay();
        }

        function handleNegate() {
            if (currentVal === "0") return;
            if (currentVal.startsWith("-")) {
                currentVal = currentVal.substring(1);
            } else {
                currentVal = "-" + currentVal;
            }
            updateDisplay();
        }

        function renderHistory() {
            if (!historyListEl) return;
            if (history.length === 0) {
                historyListEl.innerHTML = `<div class="calc-history-empty">There's no history yet.</div>`;
                return;
            }

            historyListEl.innerHTML = "";
            history.forEach(item => {
                const row = document.createElement("div");
                row.className = "calc-history-item";
                row.innerHTML = `
                    <div class="calc-history-expr">${escapeHtml(item.expr)}</div>
                    <div class="calc-history-result">${escapeHtml(item.result)}</div>
                `;
                row.addEventListener("click", () => {
                    currentVal = String(item.result);
                    resetNext = true;
                    updateDisplay();
                });
                historyListEl.appendChild(row);
            });
        }

        // Keypad clicks
        keypad.addEventListener("click", (e) => {
            const btn = e.target.closest(".calc-key");
            if (!btn) return;
            const action = btn.dataset.action;
            const val = btn.dataset.value;

            switch (action) {
                case "num": handleNumber(val); break;
                case "decimal": handleDecimal(); break;
                case "op": handleOperation(val); break;
                case "equals": handleEquals(); break;
                case "clear": handleClear(); break;
                case "backspace": handleBackspace(); break;
                case "percent": handlePercent(); break;
                case "negate": handleNegate(); break;
            }
        });

        // History toggle
        historyToggleBtn.addEventListener("click", () => {
            historyPanel.classList.toggle("active");
        });

        clearHistoryBtn.addEventListener("click", () => {
            history = [];
            saveHistory(history);
            renderHistory();
        });

        // Keyboard listener inside calculator window
        rootElement.addEventListener("keydown", (e) => {
            if (e.key >= "0" && e.key <= "9") {
                handleNumber(e.key);
            } else if (e.key === ".") {
                handleDecimal();
            } else if (e.key === "+" || e.key === "-") {
                handleOperation(e.key);
            } else if (e.key === "*") {
                handleOperation("*");
            } else if (e.key === "/") {
                e.preventDefault();
                handleOperation("/");
            } else if (e.key === "Enter" || e.key === "=") {
                e.preventDefault();
                handleEquals();
            } else if (e.key === "Backspace") {
                handleBackspace();
            } else if (e.key === "Escape") {
                handleClear();
            } else if (e.key === "%") {
                handlePercent();
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
       Register Application with Nexus App Manager
    ---------------------------------------------------------------- */
    CoreApp.registerApplication({
        id: APP_ID,
        title: "Calculator",
        width: 360,
        height: 520,
        content: () => getCalculatorHTML()
    });

    /* ----------------------------------------------------------------
       Window Creation Hook
    ---------------------------------------------------------------- */
    document.addEventListener("nexus:window:created", (event) => {
        const win = event.detail;
        if (!win || win.appId !== APP_ID) return;
        const calcRoot = win.element.querySelector("#nexus-calculator-app");
        if (calcRoot) {
            initCalculatorInstance(calcRoot);
        }
    });

    window.NexusCalculator = {
        open() {
            window.Nexus?.openApplication(APP_ID);
        }
    };

    console.log("Nexus Calculator Module loaded.");
})();
