/**
 * NEXUS WEB OS - MAIN APPLICATION ENGINE
 * Features: File Manager, Notepad, Calculator, Terminal, Task Manager, VFS & Custom Modal Manager
 */

// ==========================================
// 1. VIRTUAL FILE SYSTEM (VFS)
// ==========================================
let virtualFileSystem = [
    // Default Folders
    { id: 101, name: 'Documents', isFolder: true, folder: 'Home', size: '1 item', modified: 'System' },
    { id: 102, name: 'Projects', isFolder: true, folder: 'Home', size: '1 item', modified: 'System' },
    { id: 103, name: 'Pictures', isFolder: true, folder: 'Home', size: '1 item', modified: 'System' },
    { id: 104, name: 'Downloads', isFolder: true, folder: 'Home', size: '1 item', modified: 'System' },

    // Default Files
    { id: 1, name: 'notes.txt', isFolder: false, folder: 'Home', content: 'Welcome to Nexus Web OS!\n\nThis text editor supports writing, editing, word & character counts, and saving to the virtual file system.', size: '128 B', modified: '2m ago' },
    { id: 2, name: 'project.html', isFolder: false, folder: 'Documents', content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>My Project</title>\n</head>\n<body>\n  <h1>Hello Nexus!</h1>\n</body>\n</html>', size: '1.2 KB', modified: '18m ago' },
    { id: 3, name: 'ideas.md', isFolder: false, folder: 'Projects', content: '# Nexus Web OS Features\n- Notepad\n- Calculator\n- Terminal\n- File Manager\n- Task Manager', size: '240 B', modified: '1h ago' },
    { id: 4, name: 'wallpaper.png', isFolder: false, folder: 'Pictures', content: '[Binary Image Data]', size: '2.4 MB', modified: '3h ago' },
    { id: 5, name: 'nexus_setup.iso', isFolder: false, folder: 'Downloads', content: '[ISO Image]', size: '450 MB', modified: '1d ago' }
];

let currentFmFolder = 'Home';
let activeNotepadFileId = null;
let activeNotepadFile = null;

// ==========================================
// 2. WINDOW MANAGER & SYSTEM INITIALIZATION
// ==========================================
let zIndexCounter = 100;
const openAppsState = {
    'file-manager': false,
    'notepad': false,
    'calculator': false,
    'terminal': false,
    'task-manager': false,
    'trash': false
};

document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initWindowDragging();
    initTerminalInput();
    fmRenderFiles();
    tmRenderProcesses();
    setInterval(updateTaskbarClock, 1000);
    setInterval(tmLiveFluctuateMetrics, 2000);
});

function updateTaskbarClock() {
    const clockEl = document.getElementById('top-clock');
    if (clockEl) {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
}

function initClock() {
    updateTaskbarClock();
}

// Window z-index elevation on focus
function bringToFront(winElement) {
    zIndexCounter++;
    winElement.style.zIndex = zIndexCounter;
    document.querySelectorAll('.app-window').forEach(w => w.classList.remove('active-window'));
    winElement.classList.add('active-window');
}

function closeAllWindowsExcept(exceptAppId = null) {
    Object.keys(openAppsState).forEach(id => {
        if (id !== exceptAppId) {
            const w = document.getElementById(`win-${id}`);
            if (w) w.classList.add('hidden');
            openAppsState[id] = false;
        }
    });

    const startMenu = document.getElementById('start-menu');
    if (startMenu && !startMenu.classList.contains('hidden')) {
        startMenu.classList.add('hidden');
    }

    updateDockIndicators();
    tmRenderProcesses();
}

function openApp(appId) {
    const win = document.getElementById(`win-${appId}`);
    if (!win) return;


    closeAllWindowsExcept(appId);

    win.classList.remove('hidden');
    openAppsState[appId] = true;
    bringToFront(win);
    updateDockIndicators();
    tmRenderProcesses();


    if (appId === 'notepad') {
        notepadUpdateStats();
    }
    if (appId === 'trash') {
        trashRenderItems();
    }
}

function closeApp(appId) {
    const win = document.getElementById(`win-${appId}`);
    if (!win) return;
    win.classList.add('hidden');
    openAppsState[appId] = false;
    updateDockIndicators();
    tmRenderProcesses();
}

function minimizeApp(appId) {
    const win = document.getElementById(`win-${appId}`);
    if (!win) return;
    win.classList.add('hidden');
    openAppsState[appId] = false;
    updateDockIndicators();
    tmRenderProcesses();
}

function maximizeApp(appId) {
    const win = document.getElementById(`win-${appId}`);
    if (!win) return;
    if (win.dataset.maximized === 'true') {
        win.style.top = win.dataset.origTop || '10%';
        win.style.left = win.dataset.origLeft || '15%';
        win.style.width = win.dataset.origWidth || '750px';
        win.style.height = win.dataset.origHeight || '500px';
        win.dataset.maximized = 'false';
    } else {
        win.dataset.origTop = win.style.top;
        win.dataset.origLeft = win.style.left;
        win.dataset.origWidth = win.style.width;
        win.dataset.origHeight = win.style.height;

        win.style.top = '32px';
        win.style.left = '0';
        win.style.width = '100vw';
        win.style.height = 'calc(100vh - 32px)';
        win.dataset.maximized = 'true';
    }
}

function updateDockIndicators() {
    Object.keys(openAppsState).forEach(appId => {
        const dot = document.getElementById(`dock-dot-${appId}`);
        if (dot) {
            if (openAppsState[appId]) {
                dot.classList.remove('hidden');
            } else {
                dot.classList.add('hidden');
            }
        }
    });
}

function toggleStartMenu() {
    const menu = document.getElementById('start-menu');
    if (!menu) return;
    menu.classList.toggle('hidden');
}

// Click outside to dismiss Start Menu
document.addEventListener('click', (e) => {
    const startMenu = document.getElementById('start-menu');
    const startBtn = document.getElementById('start-btn');
    const dockLauncher = document.getElementById('dock-launcher');
    if (startMenu && !startMenu.classList.contains('hidden')) {
        if (!startMenu.contains(e.target) && (!startBtn || !startBtn.contains(e.target)) && (!dockLauncher || !dockLauncher.contains(e.target))) {
            startMenu.classList.add('hidden');
        }
    }
});

// Window Dragging Mechanism
function initWindowDragging() {
    document.querySelectorAll('.app-window').forEach(win => {
        const header = win.querySelector('.window-header');
        if (!header) return;

        let isDragging = false;
        let offsetX = 0, offsetY = 0;

        win.addEventListener('mousedown', () => bringToFront(win));
        win.addEventListener('touchstart', () => bringToFront(win), { passive: true });

        header.addEventListener('mousedown', (e) => {
            if (window.innerWidth <= 768) return; // Keep mobile snapped layout clean
            if (win.dataset.maximized === 'true') return;
            isDragging = true;
            offsetX = e.clientX - win.offsetLeft;
            offsetY = e.clientY - win.offsetTop;
            bringToFront(win);
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            win.style.left = `${e.clientX - offsetX}px`;
            win.style.top = `${e.clientY - offsetY}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    });
}

// ==========================================
// 3. CUSTOM NEXUS SYSTEM MODAL MANAGER & TOASTS
// ==========================================
let nexusModalResolver = null;

// System Toast Notification System
function showToast(message, title = 'Notification', iconClass = 'fa-solid fa-circle-check text-emerald-400') {
    let container = document.getElementById('nexus-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'nexus-toast-container';
        container.className = 'fixed bottom-16 right-4 z-[999999] flex flex-col gap-2 pointer-events-none max-w-sm w-full';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto bg-slate-900/95 border border-slate-700/80 text-slate-100 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl flex items-center gap-3 transform translate-y-4 opacity-0 transition-all duration-300 select-none';
    toast.innerHTML = `
        <i class="${iconClass} text-lg shrink-0"></i>
        <div class="flex-1 min-w-0">
            ${title ? `<div class="text-xs font-semibold text-slate-200">${title}</div>` : ''}
            <div class="text-xs text-slate-300 truncate">${message}</div>
        </div>
        <button onclick="this.parentElement.remove()" class="text-slate-500 hover:text-slate-300 transition text-xs p-1">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-4', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function nexusModalOpen() {
    const overlay = document.getElementById('nexus-modal-overlay');
    const card = document.getElementById('nexus-modal-card');
    if (!overlay || !card) return;

    overlay.style.zIndex = '99999';
    overlay.classList.remove('hidden');

    // Clicking outside modal card closes it
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            nexusModalClose(null);
        }
    };

    setTimeout(() => {
        card.classList.remove('scale-95');
        card.classList.add('scale-100');
    }, 10);
}


document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const overlay = document.getElementById('nexus-modal-overlay');
        if (overlay && !overlay.classList.contains('hidden')) {
            nexusModalClose(null);
        }
    }
});

function nexusModalClose(value) {
    const overlay = document.getElementById('nexus-modal-overlay');
    const card = document.getElementById('nexus-modal-card');
    if (card) {
        card.classList.remove('scale-100');
        card.classList.add('scale-95');
    }
    if (overlay) overlay.classList.add('hidden');
    if (nexusModalResolver) {
        const resolve = nexusModalResolver;
        nexusModalResolver = null;
        resolve(value);
    }
}

function nexusModalSubmit() {
    const inputContainer = document.getElementById('nexus-modal-input-container');
    const selectContainer = document.getElementById('nexus-modal-select-container');

    if (!inputContainer.classList.contains('hidden')) {
        const textInput = document.getElementById('nexus-modal-input');
        const textareaInput = document.getElementById('nexus-modal-textarea');

        if (!textareaInput.classList.contains('hidden')) {
            nexusModalClose(textareaInput.value);
        } else {
            nexusModalClose(textInput.value);
        }
    } else if (!selectContainer.classList.contains('hidden')) {
        const selectedOption = selectContainer.querySelector('.modal-select-item.selected');
        if (selectedOption) {
            nexusModalClose(selectedOption.dataset.value);
        } else {
            nexusModalClose(null);
        }
    } else {
        nexusModalClose(true);
    }
}

// Alert Dialog replacement
function nexusAlert(message, title = 'System Notification', iconClass = 'fa-solid fa-circle-info text-blue-400') {
    return new Promise((resolve) => {
        nexusModalResolver = resolve;

        document.getElementById('nexus-modal-title').textContent = title;
        document.getElementById('nexus-modal-icon').className = iconClass;
        document.getElementById('nexus-modal-message').textContent = message;

        document.getElementById('nexus-modal-input-container').classList.add('hidden');
        document.getElementById('nexus-modal-select-container').classList.add('hidden');

        const btnCancel = document.getElementById('nexus-modal-btn-cancel');
        const btnConfirm = document.getElementById('nexus-modal-btn-confirm');

        btnCancel.classList.add('hidden');
        btnConfirm.className = 'px-4 py-2 rounded-xl text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 border border-blue-400/30 transition shadow-lg shadow-blue-500/20';
        btnConfirm.textContent = 'OK';

        nexusModalOpen();
    });
}

// Confirm Dialog replacement
function nexusConfirm(message, title = 'Confirmation', iconClass = 'fa-solid fa-triangle-exclamation text-amber-400', confirmText = 'Confirm', isDanger = false) {
    return new Promise((resolve) => {
        nexusModalResolver = resolve;

        document.getElementById('nexus-modal-title').textContent = title;
        document.getElementById('nexus-modal-icon').className = iconClass;
        document.getElementById('nexus-modal-message').textContent = message;

        document.getElementById('nexus-modal-input-container').classList.add('hidden');
        document.getElementById('nexus-modal-select-container').classList.add('hidden');

        const btnCancel = document.getElementById('nexus-modal-btn-cancel');
        const btnConfirm = document.getElementById('nexus-modal-btn-confirm');

        btnCancel.classList.remove('hidden');
        btnCancel.textContent = 'Cancel';

        if (isDanger) {
            btnConfirm.className = 'px-4 py-2 rounded-xl text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 border border-rose-400/30 transition shadow-lg shadow-rose-500/20';
        } else {
            btnConfirm.className = 'px-4 py-2 rounded-xl text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 border border-blue-400/30 transition shadow-lg shadow-blue-500/20';
        }
        btnConfirm.textContent = confirmText;

        nexusModalOpen();
    });
}

// Prompt Dialog replacement
function nexusPrompt(message, defaultValue = '', title = 'Input Required', iconClass = 'fa-solid fa-pen-to-square text-blue-400', isTextarea = false) {
    return new Promise((resolve) => {
        nexusModalResolver = resolve;

        document.getElementById('nexus-modal-title').textContent = title;
        document.getElementById('nexus-modal-icon').className = iconClass;
        document.getElementById('nexus-modal-message').textContent = message;

        const inputContainer = document.getElementById('nexus-modal-input-container');
        const textInput = document.getElementById('nexus-modal-input');
        const textareaInput = document.getElementById('nexus-modal-textarea');
        const selectContainer = document.getElementById('nexus-modal-select-container');

        inputContainer.classList.remove('hidden');
        selectContainer.classList.add('hidden');

        if (isTextarea) {
            textInput.classList.add('hidden');
            textareaInput.classList.remove('hidden');
            textareaInput.value = defaultValue;
            setTimeout(() => textareaInput.focus(), 100);
        } else {
            textareaInput.classList.add('hidden');
            textInput.classList.remove('hidden');
            textInput.value = defaultValue;
            setTimeout(() => {
                textInput.focus();
                textInput.select();
            }, 100);
        }

        textInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                nexusModalSubmit();
            }
        };

        const btnCancel = document.getElementById('nexus-modal-btn-cancel');
        const btnConfirm = document.getElementById('nexus-modal-btn-confirm');

        btnCancel.classList.remove('hidden');
        btnCancel.textContent = 'Cancel';
        btnConfirm.className = 'px-4 py-2 rounded-xl text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 border border-blue-400/30 transition shadow-lg shadow-blue-500/20';
        btnConfirm.textContent = 'OK';

        nexusModalOpen();
    });
}

// Selectable File Picker Modal for Notepad Open
function nexusOpenFileModal(filesList) {
    return new Promise((resolve) => {
        nexusModalResolver = resolve;

        document.getElementById('nexus-modal-title').textContent = 'Open File';
        document.getElementById('nexus-modal-icon').className = 'fa-solid fa-folder-open text-amber-400';
        document.getElementById('nexus-modal-message').textContent = 'Select a file to open in Notepad:';

        document.getElementById('nexus-modal-input-container').classList.add('hidden');
        const selectContainer = document.getElementById('nexus-modal-select-container');
        selectContainer.classList.remove('hidden');
        selectContainer.innerHTML = '';

        if (filesList.length === 0) {
            selectContainer.innerHTML = '<div class="p-3 text-center text-slate-500 text-xs">No files available to open.</div>';
        } else {
            filesList.forEach((f, idx) => {
                const item = document.createElement('div');
                item.className = `modal-select-item flex items-center justify-between p-2.5 rounded-lg border border-slate-800/80 hover:bg-blue-900/30 hover:border-blue-500/40 cursor-pointer transition text-xs ${idx === 0 ? 'selected bg-blue-900/40 border-blue-500/60 text-blue-200' : 'text-slate-300'}`;
                item.dataset.value = f.name;

                let iconClass = 'fa-solid fa-file-lines text-emerald-400';
                if (f.name.endsWith('.html') || f.name.endsWith('.js') || f.name.endsWith('.md')) iconClass = 'fa-solid fa-file-code text-blue-400';

                item.innerHTML = `
                    <div class="flex items-center space-x-2.5">
                        <i class="${iconClass}"></i>
                        <span class="font-medium">${escapeHtml(f.name)}</span>
                    </div>
                    <span class="text-[10px] text-slate-500">/${escapeHtml(f.folder)}</span>
                `;

                item.onclick = () => {
                    selectContainer.querySelectorAll('.modal-select-item').forEach(el => el.classList.remove('selected', 'bg-blue-900/40', 'border-blue-500/60', 'text-blue-200'));
                    item.classList.add('selected', 'bg-blue-900/40', 'border-blue-500/60', 'text-blue-200');
                };

                item.ondblclick = () => {
                    nexusModalClose(f.name);
                };

                selectContainer.appendChild(item);
            });
        }

        const btnCancel = document.getElementById('nexus-modal-btn-cancel');
        const btnConfirm = document.getElementById('nexus-modal-btn-confirm');

        btnCancel.classList.remove('hidden');
        btnCancel.textContent = 'Cancel';
        btnConfirm.className = 'px-4 py-2 rounded-xl text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 border border-blue-400/30 transition shadow-lg shadow-blue-500/20';
        btnConfirm.textContent = 'Open';

        nexusModalOpen();
    });
}

// ==========================================
// 4. FILE MANAGER ENGINE
// ==========================================
function fmUpdateBreadcrumbs() {
    const breadcrumbsEl = document.getElementById('fm-breadcrumbs');
    if (!breadcrumbsEl) return;

    const parts = currentFmFolder.split('/').filter(p => p);
    if (parts.length === 0) parts.push('Home');

    let accumulated = '';
    const breadcrumbHtml = parts.map((part, idx) => {
        if (idx === 0) accumulated = part;
        else accumulated += '/' + part;
        const targetPath = accumulated;
        const isLast = idx === parts.length - 1;
        if (isLast) {
            return `<span class="font-semibold text-blue-300">${escapeHtml(part)}</span>`;
        } else {
            return `<span class="cursor-pointer hover:text-blue-400 underline decoration-slate-600" onclick="fmNavigateTo('${escapeHtml(targetPath)}')">${escapeHtml(part)}</span> <span class="text-slate-600">/</span>`;
        }
    }).join(' ');

    breadcrumbsEl.innerHTML = breadcrumbHtml;
}

function fmRenderFiles(filterQuery = '') {
    const grid = document.getElementById('fm-file-grid');
    if (!grid) return;
    grid.innerHTML = '';

    fmUpdateBreadcrumbs();

    let items = virtualFileSystem.filter(f => (f.folder || 'Home').toLowerCase() === currentFmFolder.toLowerCase());

    if (filterQuery.trim() !== '') {
        items = virtualFileSystem.filter(f => f.name.toLowerCase().includes(filterQuery.toLowerCase()));
    }

    if (items.length === 0) {
        grid.innerHTML = `
            <div class="col-span-4 py-12 text-center text-slate-500 text-xs">
                <i class="fa-solid fa-folder-open text-3xl mb-2 block opacity-40"></i>
                Folder is empty or no matching files.
            </div>
        `;
        return;
    }

    // Sort folders first, then files
    items.sort((a, b) => (b.isFolder ? 1 : 0) - (a.isFolder ? 1 : 0));

    items.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'group relative bg-slate-800/40 hover:bg-blue-900/30 border border-slate-800 hover:border-blue-500/40 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition transform hover:-translate-y-0.5 select-none';

        let iconClass = 'fa-solid fa-file text-slate-400';
        if (item.isFolder) {
            iconClass = 'fa-solid fa-folder text-amber-400';
        } else if (item.name.endsWith('.txt')) {
            iconClass = 'fa-solid fa-file-lines text-emerald-400';
        } else if (item.name.endsWith('.html') || item.name.endsWith('.js') || item.name.endsWith('.css') || item.name.endsWith('.md')) {
            iconClass = 'fa-solid fa-file-code text-blue-400';
        } else if (item.name.endsWith('.png') || item.name.endsWith('.jpg')) {
            iconClass = 'fa-solid fa-file-image text-indigo-400';
        } else if (item.name.endsWith('.iso') || item.name.endsWith('.zip')) {
            iconClass = 'fa-solid fa-file-zipper text-amber-400';
        }

        let displaySize = item.size || '0 B';
        if (item.isFolder) {
            const childCount = virtualFileSystem.filter(f => (f.folder || '').toLowerCase() === item.name.toLowerCase() || (f.folder || '').toLowerCase() === `${currentFmFolder}/${item.name}`.toLowerCase()).length;
            displaySize = `${childCount} item${childCount === 1 ? '' : 's'}`;
        }

        itemCard.innerHTML = `
            <!-- Top hover action toolbar -->
            <div class="card-actions absolute top-2 right-2 flex items-center space-x-1 z-10">
                <button title="Edit / Open" onclick="event.stopPropagation(); fmEditItem(${item.id})" class="action-btn bg-slate-800/90 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700 shadow">
                    <i class="fa-solid fa-pen text-[10px]"></i>
                </button>
                <button title="Rename" onclick="event.stopPropagation(); fmRenameItem(${item.id})" class="action-btn bg-slate-800/90 hover:bg-amber-600 text-slate-300 hover:text-white border border-slate-700 shadow">
                    <i class="fa-solid fa-font text-[10px]"></i>
                </button>
                <button title="Delete" onclick="event.stopPropagation(); fmDeleteItem(${item.id})" class="action-btn bg-slate-800/90 hover:bg-rose-600 text-rose-400 hover:text-white border border-slate-700 shadow">
                    <i class="fa-solid fa-trash text-[10px]"></i>
                </button>
            </div>

            <i class="${iconClass} text-3xl mb-2 group-hover:scale-110 transition"></i>
            <span class="text-xs font-medium text-slate-200 truncate w-full group-hover:text-blue-300" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
            <span class="text-[10px] text-slate-500 mt-1">${displaySize}</span>
        `;

        itemCard.ondblclick = async () => {
            if (item.isFolder) {
                const target = currentFmFolder.toLowerCase() === 'home' ? item.name : `${currentFmFolder}/${item.name}`;
                fmNavigateTo(target);
            } else if (item.name.endsWith('.txt') || item.name.endsWith('.html') || item.name.endsWith('.js') || item.name.endsWith('.md') || item.name.endsWith('.css') || item.name.endsWith('.json') || !item.name.includes('.')) {
                openFileInNotepad(item.id);
            } else {
                await nexusAlert(`Opening binary file: ${item.name}\nSize: ${displaySize}\nModified: ${item.modified}`, 'File Details', 'fa-solid fa-file-circle-info text-indigo-400');
            }
        };

        grid.appendChild(itemCard);
    });
}

function fmNavigateTo(folderName) {
    currentFmFolder = folderName || 'Home';
    document.querySelectorAll('.fm-side-link').forEach(btn => {
        if (btn.textContent.trim().toLowerCase() === folderName.toLowerCase()) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    fmRenderFiles();
}

function fmNavigateUp() {
    if (currentFmFolder.toLowerCase() === 'home') return;

    const parts = currentFmFolder.split('/').filter(p => p);
    if (parts.length <= 1) {
        fmNavigateTo('Home');
    } else {
        parts.pop();
        fmNavigateTo(parts.join('/'));
    }
}

function fmRefresh() {
    fmRenderFiles();
}

function fmSearchFiles() {
    const q = document.getElementById('fm-search').value;
    fmRenderFiles(q);
}

async function fmPromptCreateFile() {
    const filename = await nexusPrompt('Enter filename for new file (e.g. document.txt):', 'untitled.txt', 'Create New File', 'fa-solid fa-file-circle-plus text-blue-400');
    if (!filename || filename.trim() === '') return;

    const trimmedName = filename.trim();
    const existing = virtualFileSystem.find(f => (f.folder || '').toLowerCase() === currentFmFolder.toLowerCase() && f.name.toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
        await nexusAlert(`A file or folder named "${trimmedName}" already exists in this location.`, 'Item Exists', 'fa-solid fa-triangle-exclamation text-amber-400');
        return;
    }

    const initialContent = await nexusPrompt(`Enter initial text content for "${trimmedName}" (optional):`, '', 'Initial Content', 'fa-solid fa-align-left text-blue-400', true);
    if (initialContent === null) return;

    const newFile = {
        id: Date.now(),
        name: trimmedName,
        isFolder: false,
        folder: currentFmFolder,
        content: initialContent,
        size: `${initialContent.length} B`,
        modified: 'Just now'
    };

    virtualFileSystem.push(newFile);
    fmRenderFiles();

    if (trimmedName.endsWith('.txt') || trimmedName.endsWith('.html') || trimmedName.endsWith('.js') || trimmedName.endsWith('.md') || trimmedName.endsWith('.css') || trimmedName.endsWith('.json') || !trimmedName.includes('.')) {
        openFileInNotepad(newFile.id);
    }
}

async function fmPromptCreateFolder() {
    const folderName = await nexusPrompt('Enter folder name:', 'NewFolder', 'Create New Folder', 'fa-solid fa-folder-plus text-amber-400');
    if (!folderName || folderName.trim() === '') return;

    const trimmedName = folderName.trim();
    const existing = virtualFileSystem.find(f => (f.folder || '').toLowerCase() === currentFmFolder.toLowerCase() && f.name.toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
        await nexusAlert(`A folder or file named "${trimmedName}" already exists in this location.`, 'Item Exists', 'fa-solid fa-triangle-exclamation text-amber-400');
        return;
    }

    const newFolder = {
        id: Date.now(),
        name: trimmedName,
        isFolder: true,
        folder: currentFmFolder,
        size: '0 items',
        modified: 'Just now'
    };

    virtualFileSystem.push(newFolder);
    fmRenderFiles();
}

function fmEditItem(id) {
    const item = virtualFileSystem.find(f => f.id === id);
    if (!item) return;

    if (item.isFolder) {
        fmRenameItem(id);
    } else {
        openFileInNotepad(item.id);
    }
}

async function fmRenameItem(id) {
    const item = virtualFileSystem.find(f => f.id === id);
    if (!item) return;

    const newName = await nexusPrompt(`Rename ${item.isFolder ? 'folder' : 'file'} "${item.name}" to:`, item.name, 'Rename Item', 'fa-solid fa-font text-amber-400');
    if (!newName || newName.trim() === '' || newName.trim() === item.name) return;

    const trimmedName = newName.trim();
    const existing = virtualFileSystem.find(f => f.id !== id && (f.folder || '').toLowerCase() === (item.folder || '').toLowerCase() && f.name.toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
        await nexusAlert(`An item named "${trimmedName}" already exists in this location.`, 'Rename Error', 'fa-solid fa-triangle-exclamation text-amber-400');
        return;
    }

    const oldName = item.name;
    item.name = trimmedName;
    item.modified = 'Just now';

    if (item.isFolder) {
        virtualFileSystem.forEach(child => {
            if ((child.folder || '').toLowerCase() === oldName.toLowerCase()) {
                child.folder = trimmedName;
            }
        });
    }

    if (activeNotepadFileId === item.id) {
        document.getElementById('notepad-title').textContent = `Notepad - ${item.name}`;
    }

    fmRenderFiles();
}

async function fmDeleteItem(id) {
    const item = virtualFileSystem.find(f => f.id === id);
    if (!item) return;

    const itemType = item.isFolder ? 'folder' : 'file';
    const confirmed = await nexusConfirm(`Move the ${itemType} "${item.name}" to Trash?`, 'Move to Trash', 'fa-solid fa-trash-can text-rose-400', 'Move to Trash', true);
    if (!confirmed) return;

    // Move to Trash instead of permanent delete
    trashBin.push({ ...item, deletedAt: 'Just now' });
    virtualFileSystem = virtualFileSystem.filter(f => f.id !== id);

    if (item.isFolder) {
        virtualFileSystem = virtualFileSystem.filter(f => (f.folder || '').toLowerCase() !== item.name.toLowerCase() && !(f.folder || '').toLowerCase().startsWith(item.name.toLowerCase() + '/'));
    }

    if (activeNotepadFileId === id) {
        notepadNewFile();
    }

    fmRenderFiles();
    trashUpdateIcon();
    trashSyncCount();
}

// ==========================================
// 5. NOTEPAD ENGINE
// ==========================================
function openFileInNotepad(fileIdOrName) {
    let file = null;
    if (typeof fileIdOrName === 'number') {
        file = virtualFileSystem.find(f => f.id === fileIdOrName);
    } else {
        file = virtualFileSystem.find(f => f.name.toLowerCase() === fileIdOrName.toLowerCase() && !f.isFolder);
    }

    openApp('notepad');
    const editor = document.getElementById('notepad-editor');
    const title = document.getElementById('notepad-title');

    if (file) {
        editor.value = file.content || '';
        title.textContent = `Notepad - ${file.name}`;
        activeNotepadFileId = file.id;
        activeNotepadFile = file;
    } else {
        editor.value = '';
        title.textContent = `Notepad - ${fileIdOrName}`;
        activeNotepadFileId = null;
        activeNotepadFile = null;
    }
    notepadUpdateStats();
}

function notepadUpdateStats() {
    const editor = document.getElementById('notepad-editor');
    const text = editor ? editor.value : '';

    const charCount = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;

    const charEl = document.getElementById('np-char-count');
    const wordEl = document.getElementById('np-word-count');
    if (charEl) charEl.textContent = charCount;
    if (wordEl) wordEl.textContent = words;
}

function notepadNewFile() {
    document.getElementById('notepad-editor').value = '';
    document.getElementById('notepad-title').textContent = 'Notepad - Untitled.txt';
    activeNotepadFileId = null;
    activeNotepadFile = null;
    notepadUpdateStats();
}

async function notepadOpenFilePrompt() {
    const textFiles = virtualFileSystem.filter(f => !f.isFolder);
    const chosenName = await nexusOpenFileModal(textFiles);
    if (chosenName) {
        openFileInNotepad(chosenName.trim());
    }
}

async function notepadSaveFile() {
    const text = document.getElementById('notepad-editor').value;
    if (activeNotepadFileId) {
        const file = virtualFileSystem.find(f => f.id === activeNotepadFileId);
        if (file) {
            file.content = text;
            file.size = `${text.length} B`;
            file.modified = 'Just now';
            showToast(`Saved changes to "${file.name}"!`, 'Notepad Saved', 'fa-solid fa-floppy-disk text-emerald-400');
        }
    } else {
        await notepadSaveAsPrompt();
    }
    fmRenderFiles();
}

async function notepadSaveAsPrompt() {
    const filename = await nexusPrompt('Save As (Enter filename):', 'new_note.txt', 'Save File As', 'fa-solid fa-file-export text-purple-400');
    if (!filename || filename.trim() === '') return;

    const text = document.getElementById('notepad-editor').value;
    const trimmed = filename.trim();

    // Check if a file with this name already exists — ask to overwrite
    const existing = virtualFileSystem.find(f => !f.isFolder && f.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
        const overwrite = await nexusConfirm(
            `A file named "${trimmed}" already exists. Overwrite it?`,
            'File Exists', 'fa-solid fa-triangle-exclamation text-amber-400', 'Overwrite', true
        );
        if (!overwrite) return;
        existing.content = text;
        existing.size = `${text.length} B`;
        existing.modified = 'Just now';
        activeNotepadFileId = existing.id;
        activeNotepadFile = existing;
        document.getElementById('notepad-title').textContent = `Notepad - ${existing.name}`;
        showToast(`Saved as "${existing.name}"!`, 'Notepad Saved', 'fa-solid fa-circle-check text-emerald-400');
        fmRenderFiles();
        return;
    }

    const newFile = {
        id: Date.now(),
        name: trimmed,
        isFolder: false,
        folder: currentFmFolder || 'Home',
        content: text,
        size: `${text.length} B`,
        modified: 'Just now'
    };
    virtualFileSystem.push(newFile);
    activeNotepadFileId = newFile.id;
    activeNotepadFile = newFile;
    document.getElementById('notepad-title').textContent = `Notepad - ${newFile.name}`;
    showToast(`File saved as "${newFile.name}" in /${newFile.folder}!`, 'Notepad Saved', 'fa-solid fa-circle-check text-emerald-400');
    fmRenderFiles();
}

// ==========================================
// 5b. NOTEPAD EDIT TOOLBAR FUNCTIONS
// ==========================================

// Save selection before toolbar button steals focus
let _npSelStart = 0, _npSelEnd = 0;
let _npUndoStack = [], _npRedoStack = [];
const NP_MAX_HISTORY = 100;

function npSaveSelection() {
    const editor = document.getElementById('notepad-editor');
    if (editor) {
        _npSelStart = editor.selectionStart;
        _npSelEnd = editor.selectionEnd;
    }
}

function npRestoreSelection() {
    const editor = document.getElementById('notepad-editor');
    if (editor) {
        editor.focus();
        editor.setSelectionRange(_npSelStart, _npSelEnd);
    }
}

// Push state to undo stack whenever content changes
function npPushUndo() {
    const editor = document.getElementById('notepad-editor');
    if (!editor) return;
    const state = { value: editor.value, selStart: editor.selectionStart, selEnd: editor.selectionEnd };
    const last = _npUndoStack[_npUndoStack.length - 1];
    if (!last || last.value !== state.value) {
        _npUndoStack.push(state);
        if (_npUndoStack.length > NP_MAX_HISTORY) _npUndoStack.shift();
        _npRedoStack = []; // clear redo on new change
    }
}

// Call this on editor input to track history
function notepadOnInput() {
    npPushUndo();
    notepadUpdateStats();
}

function notepadUndo() {
    const editor = document.getElementById('notepad-editor');
    if (!editor) return;
    // Push current state to redo stack first
    if (editor.value !== '') {
        const cur = { value: editor.value, selStart: editor.selectionStart, selEnd: editor.selectionEnd };
        // Only push if top of undo is different
        const top = _npUndoStack[_npUndoStack.length - 1];
        if (!top || top.value !== cur.value) _npRedoStack.push(cur);
    }
    if (_npUndoStack.length > 0) {
        const prev = _npUndoStack.pop();
        editor.value = prev.value;
        editor.focus();
        editor.setSelectionRange(prev.selStart, prev.selEnd);
        notepadUpdateStats();
    }
}

function notepadRedo() {
    const editor = document.getElementById('notepad-editor');
    if (!editor) return;
    if (_npRedoStack.length > 0) {
        // Save current to undo before redo
        _npUndoStack.push({ value: editor.value, selStart: editor.selectionStart, selEnd: editor.selectionEnd });
        const next = _npRedoStack.pop();
        editor.value = next.value;
        editor.focus();
        editor.setSelectionRange(next.selStart, next.selEnd);
        notepadUpdateStats();
    }
}

function notepadCut() {
    const editor = document.getElementById('notepad-editor');
    if (!editor) return;
    const start = _npSelStart;
    const end = _npSelEnd;
    if (start === end) {
        showToast('Please select some text first to cut.', 'Cut', 'fa-solid fa-scissors text-amber-400');
        return;
    }
    const selectedText = editor.value.substring(start, end);
    npPushUndo(); // save state before mutation
    navigator.clipboard.writeText(selectedText).then(() => {
        editor.value = editor.value.substring(0, start) + editor.value.substring(end);
        editor.focus();
        editor.setSelectionRange(start, start);
        _npSelStart = start; _npSelEnd = start;
        notepadUpdateStats();
        showToast(`Cut ${selectedText.length} character(s) to clipboard.`, 'Cut!', 'fa-solid fa-scissors text-blue-400');
    }).catch(() => {
        // fallback: still delete selection, copy manually
        document.oncopy = (ev) => { ev.clipboardData.setData('text', selectedText); ev.preventDefault(); };
        editor.value = editor.value.substring(0, start) + editor.value.substring(end);
        editor.focus();
        editor.setSelectionRange(start, start);
        notepadUpdateStats();
        showToast(`Cut ${selectedText.length} character(s).`, 'Cut!', 'fa-solid fa-scissors text-blue-400');
    });
}

function notepadCopy() {
    const editor = document.getElementById('notepad-editor');
    if (!editor) return;
    const start = _npSelStart;
    const end = _npSelEnd;
    if (start === end) {
        showToast('Please select some text first to copy.', 'Copy', 'fa-regular fa-copy text-blue-400');
        return;
    }
    const selectedText = editor.value.substring(start, end);
    navigator.clipboard.writeText(selectedText).then(() => {
        npRestoreSelection();
        showToast(`Copied ${selectedText.length} character(s) to clipboard.`, 'Copied!', 'fa-regular fa-copy text-blue-400');
    }).catch(() => {
        // Fallback: select the range and use execCommand copy
        editor.focus();
        editor.setSelectionRange(start, end);
        document.execCommand('copy');
        showToast(`Copied ${selectedText.length} character(s).`, 'Copied!', 'fa-regular fa-copy text-blue-400');
    });
}

function notepadPaste() {
    const editor = document.getElementById('notepad-editor');
    if (!editor) return;
    const start = _npSelStart;
    const end = _npSelEnd;
    navigator.clipboard.readText().then(text => {
        npPushUndo();
        editor.value = editor.value.substring(0, start) + text + editor.value.substring(end);
        const newPos = start + text.length;
        editor.focus();
        editor.setSelectionRange(newPos, newPos);
        _npSelStart = newPos; _npSelEnd = newPos;
        notepadUpdateStats();
    }).catch(() => {
        nexusAlert('Clipboard access denied. Please use Ctrl+V to paste.', 'Paste Error', 'fa-solid fa-clipboard text-rose-400');
        npRestoreSelection();
    });
}

function notepadSelectAll() {
    const editor = document.getElementById('notepad-editor');
    if (!editor) return;
    editor.focus();
    editor.select();
    _npSelStart = 0;
    _npSelEnd = editor.value.length;
}

async function notepadFind() {
    npRestoreSelection();
    const searchTerm = await nexusPrompt('Enter text to find in document:', '', 'Find in Document', 'fa-solid fa-magnifying-glass text-cyan-400');
    if (!searchTerm || searchTerm.trim() === '') return;
    const editor = document.getElementById('notepad-editor');
    if (!editor) return;
    const text = editor.value;
    const idx = text.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (idx === -1) {
        await nexusAlert(`"${searchTerm}" was not found in the document.`, 'Not Found', 'fa-solid fa-magnifying-glass text-slate-400');
    } else {
        editor.focus();
        editor.setSelectionRange(idx, idx + searchTerm.length);
        _npSelStart = idx; _npSelEnd = idx + searchTerm.length;
        await nexusAlert(`Found "${searchTerm}" at character position ${idx + 1}.`, 'Found!', 'fa-solid fa-magnifying-glass text-cyan-400');
    }
}

async function notepadReplace() {
    const findTerm = await nexusPrompt('Find text:', '', 'Find & Replace — Step 1/2', 'fa-solid fa-arrow-right-arrow-left text-teal-400');
    if (findTerm === null || findTerm.trim() === '') return;
    const replaceTerm = await nexusPrompt(`Replace "${findTerm}" with:`, '', 'Find & Replace — Step 2/2', 'fa-solid fa-arrow-right-arrow-left text-teal-400');
    if (replaceTerm === null) return;
    const editor = document.getElementById('notepad-editor');
    if (!editor) return;
    const escapedFind = findTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedFind, 'gi');
    const matches = editor.value.match(regex);
    const count = matches ? matches.length : 0;
    if (count === 0) {
        await nexusAlert(`"${findTerm}" was not found in the document.`, 'Replace', 'fa-solid fa-arrow-right-arrow-left text-slate-400');
        return;
    }
    npPushUndo();
    editor.value = editor.value.replace(regex, replaceTerm);
    notepadUpdateStats();
    await nexusAlert(`Replaced ${count} occurrence(s) of "${findTerm}" with "${replaceTerm}".`, 'Replace Complete', 'fa-solid fa-circle-check text-emerald-400');
}

async function notepadClear() {
    const editor = document.getElementById('notepad-editor');
    if (!editor || editor.value.trim() === '') return;
    const confirmed = await nexusConfirm('Are you sure you want to clear all content from the editor?', 'Clear All Text', 'fa-solid fa-eraser text-rose-400', 'Clear All', true);
    if (confirmed) {
        npPushUndo();
        editor.value = '';
        _npSelStart = 0; _npSelEnd = 0;
        notepadUpdateStats();
    }
}

let notepadWordWrap = true;
function notepadToggleWordWrap() {
    notepadWordWrap = !notepadWordWrap;
    const editor = document.getElementById('notepad-editor');
    const btn = document.getElementById('np-wordwrap-btn');
    if (editor) {
        editor.style.whiteSpace = notepadWordWrap ? 'pre-wrap' : 'pre';
        editor.style.overflowX = notepadWordWrap ? 'hidden' : 'scroll';
    }
    if (btn) {
        if (notepadWordWrap) {
            btn.classList.add('np-tool-btn-active');
            btn.title = 'Word Wrap: ON (click to disable)';
        } else {
            btn.classList.remove('np-tool-btn-active');
            btn.title = 'Word Wrap: OFF (click to enable)';
        }
    }
    npRestoreSelection();
}

// ==========================================
// 5c. TRASH ENGINE
// ==========================================
let trashBin = [];

function trashSyncCount() {
    const el = document.getElementById('trash-count');
    if (el) el.textContent = trashBin.length;
}

function trashUpdateIcon() {
    const iconEl = document.getElementById('desktop-trash-icon-i');
    if (!iconEl) return;
    if (trashBin.length > 0) {
        iconEl.className = 'fa-solid fa-trash-can text-rose-400';
    } else {
        iconEl.className = 'fa-solid fa-trash-can text-slate-400';
    }
}

function trashRenderItems() {
    const grid = document.getElementById('trash-item-grid');
    if (!grid) return;
    trashSyncCount();
    grid.innerHTML = '';

    if (trashBin.length === 0) {
        grid.innerHTML = `
            <div class="col-span-4 py-12 text-center text-slate-500 text-xs">
                <i class="fa-solid fa-trash-can text-3xl mb-3 block opacity-25"></i>
                Trash is empty.
            </div>`;
        return;
    }

    trashBin.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'group relative bg-slate-800/40 hover:bg-rose-900/20 border border-slate-800 hover:border-rose-500/30 rounded-xl p-3 flex flex-col items-center justify-center text-center transition select-none';

        let iconClass = 'fa-solid fa-file text-slate-500';
        if (item.isFolder) iconClass = 'fa-solid fa-folder text-amber-400/50';
        else if (item.name.endsWith('.txt')) iconClass = 'fa-solid fa-file-lines text-emerald-400/50';
        else if (item.name.endsWith('.html') || item.name.endsWith('.js') || item.name.endsWith('.md')) iconClass = 'fa-solid fa-file-code text-blue-400/50';
        else if (item.name.endsWith('.png') || item.name.endsWith('.jpg')) iconClass = 'fa-solid fa-file-image text-indigo-400/50';
        else if (item.name.endsWith('.iso') || item.name.endsWith('.zip')) iconClass = 'fa-solid fa-file-zipper text-amber-400/50';

        card.innerHTML = `
            <div class="card-actions absolute top-2 right-2 flex items-center space-x-1 z-10">
                <button title="Restore" onclick="trashRestoreItem(${idx})" class="action-btn bg-slate-800/90 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-700 shadow">
                    <i class="fa-solid fa-rotate-left text-[10px]"></i>
                </button>
                <button title="Delete Permanently" onclick="trashDeletePermanent(${idx})" class="action-btn bg-slate-800/90 hover:bg-rose-600 text-rose-400 hover:text-white border border-slate-700 shadow">
                    <i class="fa-solid fa-xmark text-[10px]"></i>
                </button>
            </div>
            <i class="${iconClass} text-3xl mb-2 opacity-80"></i>
            <span class="text-xs font-medium text-slate-400 truncate w-full" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
            <span class="text-[10px] text-slate-600 mt-1">Deleted ${escapeHtml(item.deletedAt || 'recently')}</span>`;
        grid.appendChild(card);
    });
}

function trashRestoreItem(idx) {
    const item = trashBin[idx];
    if (!item) return;
    // Remove the deletedAt field and push back to VFS
    const { deletedAt, ...restoredItem } = item;
    virtualFileSystem.push(restoredItem);
    trashBin.splice(idx, 1);
    trashRenderItems();
    trashUpdateIcon();
    fmRenderFiles();
}

async function trashDeletePermanent(idx) {
    const item = trashBin[idx];
    if (!item) return;
    const confirmed = await nexusConfirm(
        `Permanently delete "${item.name}"? This cannot be undone.`,
        'Delete Permanently', 'fa-solid fa-triangle-exclamation text-rose-400', 'Delete Forever', true
    );
    if (!confirmed) return;
    trashBin.splice(idx, 1);
    trashRenderItems();
    trashUpdateIcon();
}

async function trashEmptyAll() {
    if (trashBin.length === 0) {
        await nexusAlert('Trash is already empty.', 'Trash', 'fa-solid fa-trash-can text-slate-400');
        return;
    }
    const confirmed = await nexusConfirm(
        `Permanently delete all ${trashBin.length} item(s) in Trash? This cannot be undone.`,
        'Empty Trash', 'fa-solid fa-fire text-rose-400', 'Empty Trash', true
    );
    if (!confirmed) return;
    trashBin = [];
    trashRenderItems();
    trashUpdateIcon();
}

// ==========================================
// 6. CALCULATOR ENGINE
// ==========================================
let calcCurrentValue = '0';
let calcPrevValue = '';
let calcPendingOp = null;
let calcHistory = [];

function calcUpdateDisplay() {
    document.getElementById('calc-display').textContent = calcCurrentValue;
    const historyPrevEl = document.getElementById('calc-history-prev');
    if (calcPendingOp && calcPrevValue !== '') {
        historyPrevEl.textContent = `${calcPrevValue} ${calcPendingOp}`;
    } else {
        historyPrevEl.textContent = '';
    }
}

function calcNum(numStr) {
    if (calcCurrentValue === '0' || calcCurrentValue === 'Error') {
        calcCurrentValue = numStr;
    } else {
        calcCurrentValue += numStr;
    }
    calcUpdateDisplay();
}

function calcDecimal() {
    if (!calcCurrentValue.includes('.')) {
        calcCurrentValue += '.';
    }
    calcUpdateDisplay();
}

function calcClear() {
    calcCurrentValue = '0';
    calcPrevValue = '';
    calcPendingOp = null;
    calcUpdateDisplay();
}

function calcToggleSign() {
    if (calcCurrentValue !== '0' && calcCurrentValue !== 'Error') {
        calcCurrentValue = calcCurrentValue.startsWith('-') ? calcCurrentValue.slice(1) : '-' + calcCurrentValue;
        calcUpdateDisplay();
    }
}

function calcPercent() {
    const val = parseFloat(calcCurrentValue);
    if (!isNaN(val)) {
        calcCurrentValue = (val / 100).toString();
        calcUpdateDisplay();
    }
}

function calcOp(op) {
    if (calcPendingOp && calcPrevValue !== '') {
        calcEquals();
    }
    calcPendingOp = op;
    calcPrevValue = calcCurrentValue;
    calcCurrentValue = '0';
    calcUpdateDisplay();
}

function calcEquals() {
    if (!calcPendingOp || calcPrevValue === '') return;

    const num1 = parseFloat(calcPrevValue);
    const num2 = parseFloat(calcCurrentValue);
    let result = 0;

    switch (calcPendingOp) {
        case '+': result = num1 + num2; break;
        case '−': result = num1 - num2; break;
        case '×': result = num1 * num2; break;
        case '÷':
            if (num2 === 0) {
                result = 'Error';
            } else {
                result = num1 / num2;
            }
            break;
    }

    const expressionStr = `${calcPrevValue} ${calcPendingOp} ${calcCurrentValue} = ${result}`;
    calcHistory.unshift(expressionStr);
    if (calcHistory.length > 5) calcHistory.pop();
    calcRenderHistory();

    calcCurrentValue = result.toString();
    calcPendingOp = null;
    calcPrevValue = '';
    calcUpdateDisplay();
}

function calcRenderHistory() {
    const historyList = document.getElementById('calc-history-list');
    if (!historyList) return;
    if (calcHistory.length === 0) {
        historyList.innerHTML = '<div>No recent calculations</div>';
        return;
    }
    historyList.innerHTML = calcHistory.map(item => `<div class="hover:text-amber-300 cursor-pointer" onclick="calcUseHistory('${item}')">${item}</div>`).join('');
}

function calcUseHistory(itemStr) {
    const parts = itemStr.split('=');
    if (parts[1]) {
        calcCurrentValue = parts[1].trim();
        calcUpdateDisplay();
    }
}

// ==========================================
// 7. TERMINAL ENGINE
// ==========================================
function initTerminalInput() {
    const input = document.getElementById('terminal-input');
    if (!input) return;

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const cmd = input.value.trim();
            if (cmd) {
                terminalExecuteCommand(cmd);
            }
            input.value = '';
        }
    });
}

function terminalExecuteCommand(cmdStr) {
    const outputContainer = document.getElementById('terminal-output');

    // Echo command line
    const cmdLine = document.createElement('div');
    cmdLine.innerHTML = `<span class="text-blue-400 font-bold">user@nexus:~$</span> <span class="text-slate-200">${escapeHtml(cmdStr)}</span>`;
    outputContainer.appendChild(cmdLine);

    const parts = cmdStr.split(' ');
    const mainCmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    const res = document.createElement('div');
    res.className = 'text-slate-300 leading-relaxed';

    switch (mainCmd) {
        case 'help':
            res.innerHTML = `
                <div class="text-yellow-400 font-semibold mb-1">Available Commands:</div>
                <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
                    <div><span class="text-emerald-400">help</span> - Show this help menu</div>
                    <div><span class="text-emerald-400">clear</span> - Clear output screen</div>
                    <div><span class="text-emerald-400">date</span> - Print current date</div>
                    <div><span class="text-emerald-400">time</span> - Print system clock time</div>
                    <div><span class="text-emerald-400">apps</span> - List active OS processes</div>
                    <div><span class="text-emerald-400">files / ls</span> - List files & folders</div>
                    <div><span class="text-emerald-400">cat &lt;file&gt;</span> - Print contents of text file</div>
                    <div><span class="text-emerald-400">create &lt;name&gt; [text]</span> - Create new file</div>
                    <div><span class="text-emerald-400">mkdir &lt;folder&gt;</span> - Create new folder</div>
                    <div><span class="text-emerald-400">rm &lt;name&gt;</span> - Delete file or folder</div>
                    <div><span class="text-emerald-400">about</span> - Display Nexus OS Info</div>
                </div>
            `;
            break;

        case 'clear':
            outputContainer.innerHTML = '';
            return;

        case 'date':
            res.textContent = new Date().toDateString();
            break;

        case 'time':
            res.textContent = new Date().toLocaleTimeString();
            break;

        case 'apps':
            res.innerHTML = `
                <div class="text-blue-400 font-semibold mb-1">Active Applications:</div>
                ${Object.keys(openAppsState).map(app => `<div>- ${app}: <span class="${openAppsState[app] ? 'text-emerald-400' : 'text-slate-500'}">${openAppsState[app] ? 'Running' : 'Stopped'}</span></div>`).join('')}
            `;
            break;

        case 'files':
        case 'ls':
            res.innerHTML = virtualFileSystem.map(f => `<span class="${f.isFolder ? 'text-amber-400 font-bold' : 'text-emerald-400'}">${f.isFolder ? '[DIR] ' : ''}${f.name}</span> <span class="text-slate-500">(/${f.folder} - ${f.size})</span>`).join('<br>');
            break;

        case 'cat':
            if (args.length === 0) {
                res.textContent = 'Usage: cat <filename>';
            } else {
                const targetName = args[0];
                const file = virtualFileSystem.find(f => f.name.toLowerCase() === targetName.toLowerCase() && !f.isFolder);
                if (file) {
                    res.innerHTML = `<div class="p-2 bg-slate-900 border border-slate-800 rounded text-slate-200 whitespace-pre-wrap">${escapeHtml(file.content)}</div>`;
                } else {
                    res.textContent = `cat: ${targetName}: No such file found.`;
                }
            }
            break;

        case 'create':
        case 'touch':
            if (args.length === 0) {
                res.textContent = 'Usage: create <filename> [content]';
            } else {
                const newName = args[0];
                const contentText = args.slice(1).join(' ') || 'Created via Nexus Terminal';
                virtualFileSystem.push({
                    id: Date.now(),
                    name: newName,
                    isFolder: false,
                    folder: currentFmFolder || 'Home',
                    content: contentText,
                    size: `${contentText.length} B`,
                    modified: 'Just now'
                });
                res.textContent = `File '${newName}' created successfully in /${currentFmFolder || 'Home'}.`;
                fmRenderFiles();
            }
            break;

        case 'mkdir':
            if (args.length === 0) {
                res.textContent = 'Usage: mkdir <folder_name>';
            } else {
                const folderName = args[0];
                const existing = virtualFileSystem.find(f => (f.folder || '').toLowerCase() === currentFmFolder.toLowerCase() && f.name.toLowerCase() === folderName.toLowerCase());
                if (existing) {
                    res.textContent = `mkdir: cannot create directory '${folderName}': File or directory exists`;
                } else {
                    virtualFileSystem.push({
                        id: Date.now(),
                        name: folderName,
                        isFolder: true,
                        folder: currentFmFolder,
                        size: '0 items',
                        modified: 'Just now'
                    });
                    res.textContent = `Directory '${folderName}' created in /${currentFmFolder}.`;
                    fmRenderFiles();
                }
            }
            break;

        case 'rm':
            if (args.length === 0) {
                res.textContent = 'Usage: rm <filename/foldername>';
            } else {
                const targetName = args[0];
                const target = virtualFileSystem.find(f => f.name.toLowerCase() === targetName.toLowerCase() && (f.folder || '').toLowerCase() === currentFmFolder.toLowerCase());
                if (target) {
                    fmDeleteItem(target.id);
                    res.textContent = `Removed '${targetName}'.`;
                } else {
                    res.textContent = `rm: cannot remove '${targetName}': No such file or directory`;
                }
            }
            break;

        case 'about':
            res.innerHTML = `
                <div class="text-indigo-400 font-bold">NEXUS WEB OPERATING SYSTEM v1.0</div>
                <div>Designed with HTML5, Tailwind CSS & JavaScript.</div>
                <div>Built for high performance web productivity.</div>
            `;
            break;

        default:
            res.textContent = `nexus: command not found: ${mainCmd}. Type 'help' for command list.`;
            break;
    }

    outputContainer.appendChild(res);

    // Auto scroll terminal
    const terminalBody = document.getElementById('terminal-body');
    if (terminalBody) {
        terminalBody.scrollTop = terminalBody.scrollHeight;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ==========================================
// 8. TASK MANAGER ENGINE
// ==========================================
const processData = [
    { id: 'file-manager', name: 'File Manager', cpu: 2.1, memory: 42, status: 'Running' },
    { id: 'notepad', name: 'Notepad', cpu: 0.3, memory: 12, status: 'Running' },
    { id: 'calculator', name: 'Calculator', cpu: 0.1, memory: 8, status: 'Running' },
    { id: 'terminal', name: 'Terminal', cpu: 0.4, memory: 18, status: 'Running' },
    { id: 'task-manager', name: 'Task Manager', cpu: 1.2, memory: 31, status: 'Running' },
    { id: 'trash', name: 'Trash', cpu: 0.1, memory: 6, status: 'Running' },
    { id: 'browser', name: 'Web Browser', cpu: 8.4, memory: 128, status: 'Running' }
];

function tmRenderProcesses() {
    const tbody = document.getElementById('task-manager-list');
    if (!tbody) return;
    tbody.innerHTML = '';

    let totalCpu = 0;
    let totalMem = 0;

    processData.forEach(p => {
        const isRunning = openAppsState[p.id] !== undefined ? openAppsState[p.id] : true;
        const statusText = isRunning ? 'Running' : 'Stopped';
        const statusColor = isRunning ? 'text-emerald-400' : 'text-slate-500';

        if (isRunning) {
            totalCpu += p.cpu;
            totalMem += p.memory;
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/40 transition';
        const cpuPct = isRunning ? Math.min(p.cpu, 100) : 0;
        const cpuBarColor = cpuPct > 60 ? '#f87171' : cpuPct > 30 ? '#fbbf24' : '#34d399';
        const memColor = p.memory > 100 ? 'text-rose-400' : p.memory > 40 ? 'text-amber-400' : 'text-emerald-400';

        let actionBtn = '';
        if (p.isCustom) {
            actionBtn = `<button onclick="tmKillCustomTask('${p.id}')" class="bg-rose-900/40 hover:bg-rose-800 text-rose-300 border border-rose-800/60 text-[11px] px-2.5 py-1 rounded transition">Kill</button>`;
        } else if (isRunning && p.id !== 'task-manager') {
            actionBtn = `<button onclick="closeApp('${p.id}')" class="bg-rose-900/40 hover:bg-rose-800 text-rose-300 border border-rose-800/60 text-[11px] px-2.5 py-1 rounded transition">End Task</button>`;
        } else if (!isRunning) {
            actionBtn = `<button onclick="openApp('${p.id}')" class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] px-2.5 py-1 rounded transition">Start</button>`;
        } else {
            actionBtn = `<span class="text-slate-600 text-[11px]">System</span>`;
        }

        tr.innerHTML = `
            <td class="py-2.5 flex items-center space-x-2 font-sans font-medium text-slate-200">
                <i class="fa-solid fa-circle text-[8px] ${isRunning ? 'text-emerald-400' : 'text-slate-600'}"></i>
                <span>${p.name}${p.isCustom ? ' <span class="text-[9px] text-blue-400/70 border border-blue-500/20 px-1 rounded ml-1">custom</span>' : ''}</span>
            </td>
            <td class="py-2.5">
                <div class="flex items-center gap-2">
                    <div class="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-700" style="width:${cpuPct}%;background:${cpuBarColor}"></div>
                    </div>
                    <span class="text-slate-300 text-[11px] font-mono">${isRunning ? p.cpu.toFixed(1) + '%' : '0.0%'}</span>
                </div>
            </td>
            <td class="py-2.5 ${memColor} font-mono text-[11px]">${isRunning ? p.memory + ' MB' : '0 MB'}</td>
            <td class="py-2.5 font-sans text-xs font-medium">
                <span class="inline-flex items-center gap-1 ${statusColor}">
                    <i class="fa-solid fa-circle text-[7px]"></i>${statusText}
                </span>
            </td>
            <td class="py-2.5 text-right font-sans">${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });

    const cpuEl = document.getElementById('tm-cpu-total');
    const memEl = document.getElementById('tm-mem-total');
    if (cpuEl) cpuEl.textContent = `${totalCpu.toFixed(1)}%`;
    if (memEl) memEl.textContent = `${totalMem} MB / 4 GB`;
}

function tmRefresh() {
    tmRenderProcesses();
}

function tmLiveFluctuateMetrics() {
    processData.forEach(p => {
        p.cpu = Math.max(0.1, +(p.cpu + (Math.random() * 1.6 - 0.8)).toFixed(1));
    });
    if (openAppsState['task-manager']) {
        tmRenderProcesses();
    }
}

async function tmAddTask() {
    const taskName = await nexusPrompt('Enter process / task name:', 'My Process', 'Add New Task', 'fa-solid fa-plus text-blue-400');
    if (!taskName || taskName.trim() === '') return;

    const trimmed = taskName.trim();
    const existing = processData.find(p => p.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
        await nexusAlert(`A process named "${trimmed}" already exists.`, 'Process Exists', 'fa-solid fa-triangle-exclamation text-amber-400');
        return;
    }

    const newProcess = {
        id: `custom-${Date.now()}`,
        name: trimmed,
        cpu: parseFloat((Math.random() * 4).toFixed(1)),
        memory: Math.floor(Math.random() * 60) + 8,
        status: 'Running',
        isCustom: true
    };

    processData.push(newProcess);
    openAppsState[newProcess.id] = true;
    tmRenderProcesses();
    await nexusAlert(`Process "${trimmed}" started and added to the task list.`, 'Task Added', 'fa-solid fa-circle-check text-emerald-400');
}

function tmKillCustomTask(processId) {
    const idx = processData.findIndex(p => p.id === processId);
    if (idx !== -1) {
        processData.splice(idx, 1);
        delete openAppsState[processId];
        updateDockIndicators();
        tmRenderProcesses();
    }
}
