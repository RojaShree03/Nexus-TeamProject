/* ---------- Data ---------- */

const USERS = [
    { id: 1, name: "Member 1", email: "Member 1@nexus" },
    { id: 2, name: "Member 2", email: "Member 2@nexus" },
    { id: 3, name: "Member 3", email: "Member 3@nexus" },
    { id: 4, name: "Member 4", email: "Member 4@nexus" },
    { id: 5, name: "Member 5", email: "Member 5@nexus" }
];

const DEFAULT_FILES = [
    {
        id: 1, name: "Project Proposal.docx", type: "document", category: "documents", ownerId: 1,
        editorIds: [], tags: ["important", "draft"], size: "1.2 MB", modified: "Today, 10:30 AM",
        modifiedAt: Date.now(), content: "Project proposal content..."
    },
    {
        id: 2, name: "UI Design.fig", type: "design", category: "projects", ownerId: 2,
        editorIds: [1], tags: ["design"], size: "4.1 MB", modified: "Yesterday",
        modifiedAt: Date.now() - 86400000, content: "UI design notes..."
    },
    {
        id: 3, name: "Database Schema.pdf", type: "document", category: "documents", ownerId: 3,
        editorIds: [], tags: ["backend"], size: "840 KB", modified: "Yesterday",
        modifiedAt: Date.now() - 86400000, content: "Database schema..."
    },
    {
        id: 4, name: "Team Meeting.mp3", type: "audio", category: "audio", ownerId: 4,
        editorIds: [], tags: [], size: "12 MB", modified: "2 days ago",
        modifiedAt: Date.now() - 172800000, content: ""
    },
    {
        id: 5, name: "Demo Video.mp4", type: "video", category: "videos", ownerId: 5,
        editorIds: [], tags: ["demo"], size: "48 MB", modified: "3 days ago",
        modifiedAt: Date.now() - 259200000, content: ""
    }
];

const DEFAULT_FOLDERS = [
    { name: "Documents", category: "documents", count: 12, icon: "file", ownerId: 1 },
    { name: "Projects", category: "projects", count: 8, icon: "folder", ownerId: 1 },
    { name: "Pictures", category: "pictures", count: 34, icon: "image", ownerId: 1 },
    { name: "Downloads", category: "downloads", count: 6, icon: "folder", ownerId: 1 }
];

const DEFAULT_LOGS = [
    { userId: 1, action: "created", target: "Project Proposal.docx", time: "Today, 10:30 AM" },
    { userId: 2, action: "edited", target: "UI Design.fig", time: "Yesterday, 4:20 PM" },
    { userId: 3, action: "created", target: "Database Schema.pdf", time: "Yesterday, 1:15 PM" }
];

const PREDEFINED_TAGS = ["important", "draft", "urgent", "review", "archived"];

/* ---------- State + storage ---------- */

const state = {
    userId: Number(localStorage.getItem("nexusUserId") || 1),
    files: load("nexusFiles", DEFAULT_FILES),
    folders: load("nexuss", DEFAULT_FOLDERS),
    logs: load("nexusLogs", DEFAULT_LOGS),
    trash: load("nexusTrash", []),
    notifications: load("nexusNotifications", []),
    currentView: "home",
    history: ["home"],
    historyIndex: 0
};

function load(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? structuredClone(fallback);
    } catch {
        return structuredClone(fallback);
    }
}

function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function persist() {
    save("nexusUserId", state.userId);
    save("nexusFiles", state.files);
    save("nexusFolders", state.folders);
    save("nexusLogs", state.logs);
    save("nexusTrash", state.trash);
    save("nexusNotifications", state.notifications);
}

/* ---------- Small helpers ---------- */

const $ = id => document.getElementById(id);
const userById = id => USERS.find(user => user.id === Number(id)) || USERS[0];
const currentUser = () => userById(state.userId);

function nowText() {
    return new Date().toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function icon(type) {
    const ids = { document: "file-icon", design: "folder-icon", audio: "audio-icon", video: "video-icon", image: "image-icon", text: "file-icon", folder: "folder-icon" };
    return `<svg><use href="#${ids[type] || "file-icon"}"></use></svg>`;
}

function fileOwner(file) {
    return userById(file.ownerId || 1).name;
}

function fileCategoryName(category) {
    return category.charAt(0).toUpperCase() + category.slice(1);
}

function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
}

function safeId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}

function formatBytes(bytes) {
    if (!bytes) return "0 KB";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

function parseSizeToBytes(size = "0 KB") {
    const [value, unit = "KB"] = size.split(" ");
    const factor = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 };
    return Number(value) * (factor[unit] || 1024);
}

/* ---------- Permissions ---------- */

function roleForFile(file) {
    if (file.ownerId === state.userId) return "owner";
    if (Array.isArray(file.editorIds) && file.editorIds.includes(state.userId)) return "editor";
    return "viewer";
}

function canEditFile(file) {
    const role = roleForFile(file);
    return role === "owner" || role === "editor";
}

function canDeleteFile(file) {
    return roleForFile(file) === "owner";
}

/* ---------- Toasts ---------- */

function showToast(message, type = "success") {
    const container = $("toastContainer");
    if (!container) return;

    const toastEl = document.createElement("div");
    toastEl.className = `toast toast-${type}`;
    toastEl.textContent = message;
    container.appendChild(toastEl);

    setTimeout(() => {
        toastEl.classList.add("toast-hide");
        setTimeout(() => toastEl.remove(), 300);
    }, 3000);
}

/* ---------- Activity log ---------- */

function logAction(action, target, details = "") {
    state.logs.unshift({ userId: state.userId, action, target, details, time: nowText() });
    save("nexusLogs", state.logs);
}

function logIcon(action = "") {
    const a = action.toLowerCase();
    if (a.includes("delete")) return "🗑️";
    if (a.includes("restore")) return "♻️";
    if (a.includes("upload")) return "📤";
    if (a.includes("creat")) return "🆕";
    if (a.includes("edit")) return "✏️";
    if (a.includes("access") || a.includes("permission")) return "🔒";
    return "•";
}

/* ---------- Notifications ---------- */

function notifyOwner(file, message) {
    if (file.ownerId === state.userId) return;

    state.notifications.unshift({
        id: safeId(),
        forUserId: file.ownerId,
        message,
        time: nowText(),
        read: false
    });
    save("nexusNotifications", state.notifications);
}

function myNotifications() {
    return state.notifications.filter(n => n.forUserId === state.userId);
}

function unreadNotificationCount() {
    return myNotifications().filter(n => !n.read).length;
}

function renderNotifications() {
    const mine = myNotifications();
    const count = unreadNotificationCount();

    const badge = $("notifBadge");
    if (badge) {
        badge.textContent = count;
        badge.classList.toggle("hidden", count === 0);
    }

    const list = $("notifList");
    if (!list) return;
    list.innerHTML = mine.length
        ? mine.map(n => `
            <div class="notif-item ${n.read ? "" : "notif-unread"}" notifid="${n.id}">
                <p>${escapeHtml(n.message)}</p>
                <small>${escapeHtml(n.time)}</small>
            </div>`).join("")
        : `<div class="notif-item"><p>No notifications yet.</p></div>`;
}

function markAllNotificationsRead() {
    state.notifications.forEach(n => { if (n.forUserId === state.userId) n.read = true; });
    save("nexusNotifications", state.notifications);
    renderNotifications();
}

/* ---------- Blob storage (IndexedDB) ---------- */

const DB_NAME = "nexus-file-data";
const STORE = "blobs";
let dbPromise;

function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return dbPromise;
}

async function saveBlob(id, blob) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(blob, String(id));
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}

async function getBlob(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const request = db.transaction(STORE, "readonly").objectStore(STORE).get(String(id));
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

async function deleteBlob(id) {
    try {
        const db = await openDB();
        db.transaction(STORE, "readwrite").objectStore(STORE).delete(String(id));
    } catch {
        /* metadata can still be removed even if this fails */
    }
}

/* ---------- Recycle bin ---------- */

function purgeExpiredTrash() {
    const FIFTEEN_DAYS_IN_MS = 15 * 24 * 60 * 60 * 1000;
    const before = state.trash.length;

    const stillWithinHoldPeriod = [];
    for (const file of state.trash) {
        const age = Date.now() - file.deletedAt;
        if (age > FIFTEEN_DAYS_IN_MS) {
            deleteBlob(file.id);
        } else {
            stillWithinHoldPeriod.push(file);
        }
    }
    state.trash = stillWithinHoldPeriod;

    if (state.trash.length !== before) persist();
}

function trashRow(file) {
    const FIFTEEN_DAYS_IN_MS = 15 * 24 * 60 * 60 * 1000;
    const millisecondsLeft = FIFTEEN_DAYS_IN_MS - (Date.now() - file.deletedAt);
    const daysLeft = Math.max(0, Math.ceil(millisecondsLeft / (24 * 60 * 60 * 1000)));
    const canDeleteForever = file.ownerId === state.userId;

    return `<tr class="file-row" fileid="${file.id}">
        <td><div class="file-name"><span class="file-icon">${icon(file.type)}</span>
            <div><strong>${escapeHtml(file.name)}</strong><small>Deleted by ${escapeHtml(userById(file.deletedBy).name)}</small></div>
        </div></td>
        <td>${escapeHtml(file.type)}</td>
        <td>${escapeHtml(fileOwner(file))}</td>
        <td>${daysLeft} day${daysLeft === 1 ? "" : "s"} left</td>
        <td>${escapeHtml(file.size)}</td>
        <td><div class="row-actions">
            <button class="small-btn restore-file" fileid="${file.id}">Restore</button>
            ${canDeleteForever ? `<button class="small-btn delete-forever" fileid="${file.id}">Delete Forever</button>` : ""}
        </div></td>
    </tr>`;
}

function renderTrash() {
    $("trashFiles").innerHTML = state.trash.length
        ? state.trash.map(trashRow).join("")
        : `<tr><td colspan="6">Recycle Bin is empty.</td></tr>`;
    $("trashCount").textContent = `${state.trash.length} item${state.trash.length === 1 ? "" : "s"}`;
}

/* ---------- Tags + filtering ---------- */

function getAllTags(files) {
    const tagSet = new Set(PREDEFINED_TAGS);
    files.forEach(file => (file.tags || []).forEach(tag => tagSet.add(tag)));
    return [...tagSet].sort();
}

function filterAndSortFiles(files, tagFilter, sortKey) {
    let result = files;

    if (tagFilter && tagFilter !== "all") {
        result = result.filter(file => Array.isArray(file.tags) && file.tags.includes(tagFilter));
    }

    result = [...result];

    if (sortKey === "name-asc") result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortKey === "name-desc") result.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortKey === "newest") result.sort((a, b) => (b.modifiedAt || 0) - (a.modifiedAt || 0));
    else if (sortKey === "oldest") result.sort((a, b) => (a.modifiedAt || 0) - (b.modifiedAt || 0));
    else if (sortKey === "size") result.sort((a, b) => parseSizeToBytes(b.size) - parseSizeToBytes(a.size));

    return result;
}

/* ---------- Rendering: profile + folders ---------- */

function updateProfile() {
    const user = currentUser();
    $("profileName").textContent = user.name;
    $("profileEmail").textContent = user.email;
    $("profileAvatar").textContent = user.name[0];
    $("switchUserSelect").innerHTML = USERS.map(u => `<option value="${u.id}" ${u.id === state.userId ? "selected" : ""}>${escapeHtml(u.name)} — ${escapeHtml(u.email)}</option>`).join("");
}

function renderFolders() {
    $("folderGrid").innerHTML = state.folders.map(folder => {
        const isOwner = folder.ownerId === state.userId;
        return `<div class="folder-card-wrap">
            <button class="folder-card" category="${escapeHtml(folder.category)}">
                <span class="folder-icon">${icon(folder.icon)}</span><strong>${escapeHtml(folder.name)}</strong>
            </button>
            ${isOwner ? `
                <div class="folder-owner-actions">
                    <button class="folder-rename-btn" folder="${escapeHtml(folder.category)}" title="Rename folder">✎</button>
                    <button class="folder-delete-btn" folder="${escapeHtml(folder.category)}" title="Delete folder">×</button>
                </div>` : ""}
        </div>`;
    }).join("");
}

function renameFolder(category) {
    const folder = state.folders.find(f => f.category === category); if (!folder) return;
    if (folder.ownerId !== state.userId) { showToast("Only the folder owner can rename it.", "error"); return; }

    const newName = prompt("Rename folder:", folder.name);
    if (!newName || !newName.trim()) return;

    const oldName = folder.name;
    folder.name = newName.trim();
    persist();
    logAction("renamed folder", folder.name, `Previously "${oldName}"`);
    renderFolders();
    showToast(`Folder renamed to "${folder.name}"`, "success");
}

function deleteFolder(category) {
    const folder = state.folders.find(f => f.category === category); if (!folder) return;
    if (folder.ownerId !== state.userId) { showToast("Only the folder owner can delete it.", "error"); return; }

    const filesInside = state.files.filter(f => f.category === category);

    openModal(`
        <h2>Delete "${escapeHtml(folder.name)}"</h2>
        <p class="muted-text">This folder has ${filesInside.length} file${filesInside.length === 1 ? "" : "s"} in it. Choose what should happen to them.</p>
        <div class="form-group">
            <label class="checkbox-row">
                <input type="radio" name="folderDeleteMode" value="keep" checked>
                Delete folder only — keep the files where they are
            </label>
            <label class="checkbox-row">
                <input type="radio" name="folderDeleteMode" value="trash" ${filesInside.length === 0 ? "disabled" : ""}>
                Delete folder AND move its files to the Recycle Bin
            </label>
        </div>
        <div class="form-actions">
            <button class="secondary-btn" id="cancelModal">Cancel</button>
            <button class="primary-btn" id="confirmFolderDelete">Delete Folder</button>
        </div>`);

    $("cancelModal").onclick = closeModal;
    $("confirmFolderDelete").onclick = () => {
        const mode = document.querySelector('input[name="folderDeleteMode"]:checked').value;

        if (mode === "trash" && filesInside.length > 0) {
            for (const file of filesInside) {
                state.files = state.files.filter(f => f.id !== file.id);
                file.deletedAt = Date.now();
                file.deletedBy = state.userId;
                if (!Array.isArray(state.trash)) state.trash = [];
                state.trash.push(file);
                logAction("deleted", file.name, `Moved to Recycle Bin (folder "${folder.name}" deleted)`);
                notifyOwner(file, `${currentUser().name} deleted the "${folder.name}" folder, moving "${file.name}" to the Recycle Bin`);
            }
        }

        state.folders = state.folders.filter(f => f.category !== category);
        persist();
        logAction("deleted folder", folder.name, mode === "trash" ? `${filesInside.length} file(s) moved to Recycle Bin` : "Files kept");

        closeModal();
        renderFolders();
        renderRecent();
        renderNotifications();
        showToast(`Folder "${folder.name}" deleted`, "success");
    };
}

/* ---------- Rendering: files ---------- */

function fileRow(file, compact = false) {
    const role = roleForFile(file);
    const roleBadge = `<span class="role-badge role-${role}">${role}</span>`;

    const tags = Array.isArray(file.tags) ? file.tags : [];
    const tagPills = tags.length
        ? `<div class="tag-row">${tags.map(t => `<span class="tag-pill">#${escapeHtml(t)}</span>`).join("")}</div>`
        : "";

    const showEdit = canEditFile(file);
    const showDelete = canDeleteFile(file);

    return `<tr class="file-row" fileid="${file.id}" title="Double-click to open">
        <td><div class="file-name"><span class="file-icon">${icon(file.type)}</span>
            <div>
                <strong>${escapeHtml(file.name)}</strong>${compact ? "" : `<small>${escapeHtml(fileCategoryName(file.category))}</small>`}
                ${tagPills}
            </div>
        </div></td>
        <td>${escapeHtml(file.type)}</td>
        <td>${escapeHtml(fileOwner(file))} ${roleBadge}</td>
        <td>${escapeHtml(file.modified)}</td>
        <td>${escapeHtml(file.size)}</td>
        <td><div class="row-actions">
            ${showEdit ? `<button class="small-btn edit-file" fileid="${file.id}">Edit</button>` : ""}
            ${showDelete ? `<button class="small-btn delete-file" fileid="${file.id}">Delete</button>` : ""}
        </div></td>
    </tr>`;
}

function renderRecent(files = state.files.slice(0, 8)) {
    $("recentFiles").innerHTML = files.length ? files.map(f => fileRow(f, true)).join("") : `<tr><td colspan="6">No files yet.</td></tr>`;
}

function renderCategory(category) {
    const allFilesInCategory = state.files.filter(file => file.category === category);

    const tags = getAllTags(allFilesInCategory);
    const tagSelect = $("categoryTagFilter");
    const previouslySelectedTag = tagSelect.value || "all";
    tagSelect.innerHTML = `<option value="all">All tags</option>` +
        tags.map(tag => `<option value="${escapeHtml(tag)}">#${escapeHtml(tag)}</option>`).join("");
    tagSelect.value = tags.includes(previouslySelectedTag) ? previouslySelectedTag : "all";

    const sortKey = $("categorySort").value || "name-asc";
    const files = filterAndSortFiles(allFilesInCategory, tagSelect.value, sortKey);

    $("categoryTitle").textContent = fileCategoryName(category);
    $("categoryCount").textContent = `${allFilesInCategory.length} item${allFilesInCategory.length === 1 ? "" : "s"}`;
    $("categoryFiles").innerHTML = files.length ? files.map(f => fileRow(f)).join("") : `<tr><td colspan="6">No files match this filter.</td></tr>`;
}

/* ---------- Rendering: activity log ---------- */

function renderLogFilter() {
    $("logUserFilter").innerHTML = `<option value="all">All users</option>${USERS.map(u => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join("")}`;
}

function renderLogs() {
    const selected = $("logUserFilter").value || "all";
    const logs = selected === "all" ? state.logs : state.logs.filter(log => Number(log.userId) === Number(selected));
    $("logPreview").innerHTML = logs.length
        ? logs.map(log => `
            <div class="log-item">
                <span class="log-icon">${logIcon(log.action)}</span>
                <div class="log-item-body">
                    <div><strong>${escapeHtml(userById(log.userId).name)}</strong> ${escapeHtml(log.action)} <strong>${escapeHtml(log.target)}</strong></div>
                    ${log.details ? `<span class="log-detail">${escapeHtml(log.details)}</span>` : ""}
                    <small>${escapeHtml(log.time)}</small>
                </div>
            </div>`).join("")
        : `<div class="log-item">No activity for this user.</div>`;
}

/* ---------- View switching ---------- */

function showView(view, addHistory = true) {
    state.currentView = view;
    document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("active", btn.getAttribute("view") === view));
    ["homeView", "categoryView", "searchView", "logsView", "trashView"].forEach(id => $(id).classList.add("hidden"));
    $("headingActions").classList.toggle("hidden", view === "logs");

    const titles = {
        home: ["Home", "Home"],
        logs: ["Activity Log", "Team / Activity"],
        trash: ["Recycle Bin", "Team / Recycle Bin"]
    };

    if (view === "home") {
        $("homeView").classList.remove("hidden"); $("pageTitle").textContent = "Home"; $("breadcrumb").textContent = "Home";
    } else if (view === "logs") {
        $("logsView").classList.remove("hidden"); $("pageTitle").textContent = titles.logs[0]; $("breadcrumb").textContent = titles.logs[1]; renderLogFilter(); renderLogs();
    } else if (view === "trash") {
        $("trashView").classList.remove("hidden"); $("pageTitle").textContent = titles.trash[0]; $("breadcrumb").textContent = titles.trash[1];
        purgeExpiredTrash(); renderTrash();
    } else if (view !== "search") {
        $("categoryView").classList.remove("hidden"); $("pageTitle").textContent = fileCategoryName(view); $("breadcrumb").textContent = `Home / ${view}`; renderCategory(view);
    }

    if (addHistory) { state.history = state.history.slice(0, state.historyIndex + 1); state.history.push(view); state.historyIndex++; }
}

function renderSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q) return showView("home");

    const files = state.files.filter(f => `${f.name} ${f.type} ${fileOwner(f)} ${f.category} ${(f.tags || []).join(" ")} ${f.content || ""}`.toLowerCase().includes(q));
    const logs = state.logs.filter(l => `${userById(l.userId).name} ${l.action} ${l.target} ${l.details || ""}`.toLowerCase().includes(q));

    ["homeView", "categoryView", "logsView", "trashView"].forEach(id => $(id).classList.add("hidden"));
    $("searchView").classList.remove("hidden"); $("pageTitle").textContent = "Search Results"; $("breadcrumb").textContent = `Search / ${q}`;
    $("searchSummary").textContent = `${files.length} file${files.length !== 1 ? "s" : ""}, ${logs.length} log${logs.length !== 1 ? "s" : ""}`;

    const fileGroup = files.length
        ? `<div class="result-group"><h3>Files</h3>${files.map(f => `<button class="search-result file-result" fileid="${f.id}"><span class="file-icon">${icon(f.type)}</span><span><strong>${escapeHtml(f.name)}</strong><small>${escapeHtml(fileOwner(f))} · ${escapeHtml(f.category)}</small></span></button>`).join("")}</div>`
        : "";
    const logGroup = logs.length
        ? `<div class="result-group"><h3>Activity</h3>${logs.slice(0, 20).map(l => `<div class="search-result"><span class="avatar">${userById(l.userId).name[0]}</span><span><strong>${escapeHtml(userById(l.userId).name)} ${escapeHtml(l.action)}</strong><small>${escapeHtml(l.target)} · ${escapeHtml(l.time)}</small></span></div>`).join("")}</div>`
        : "";
    const emptyState = !files.length && !logs.length ? `<div class="empty-search">No matching files or activity.</div>` : "";

    $("searchResults").innerHTML = `${fileGroup}${logGroup}${emptyState}`;
}

/* ---------- Modal helpers ---------- */

function openModal(content) {
    $("modalContent").innerHTML = content;
    $("modalOverlay").classList.remove("hidden");
}

function closeModal() {
    $("modalOverlay").classList.add("hidden");
    $("modalContent").innerHTML = "";
}

/* ---------- Creating files + folders ---------- */

function allFolderChoices() {
    const baseCategories = [
        { category: "documents", name: "Documents" },
        { category: "projects", name: "Projects" },
        { category: "pictures", name: "Pictures" },
        { category: "audio", name: "Audio" },
        { category: "videos", name: "Videos" }
    ];
    const choices = [...baseCategories];
    state.folders.forEach(folder => {
        if (!choices.some(c => c.category === folder.category)) choices.push({ category: folder.category, name: folder.name });
    });
    return choices;
}

function openNewFile() {
    const tagOptions = PREDEFINED_TAGS.map(t => `<option value="${t}">${t}</option>`).join("");
    const folderOptions = allFolderChoices().map(f => `<option value="${escapeHtml(f.category)}">${escapeHtml(f.name)}</option>`).join("");

    openModal(`<h2>Create New File</h2>
        <div class="form-group"><label>File name</label><input id="newFileName" placeholder="example.txt"></div>
        <div class="form-group"><label>File type</label><select id="newFileType"><option value="text">Text</option><option value="document">Document</option><option value="audio">Audio</option><option value="video">Video</option><option value="image">Image</option></select></div>
        <div class="form-group"><label>Folder</label><select id="newFileCategory">${folderOptions}</select></div>
        <div class="form-group">
            <label>Tags</label>
            <div class="tag-picker">
                <select id="newFileTagSelect">
                    <option value="">Choose a tag…</option>
                    ${tagOptions}
                    <option value="__custom">+ Custom tag</option>
                </select>
                <input id="newFileCustomTag" class="hidden" placeholder="Type a custom tag">
                <button type="button" class="secondary-btn" id="addTagBtn">Add</button>
            </div>
            <div id="newFileTagList" class="tag-row"></div>
        </div>
        <div class="form-group"><label>Content / notes</label><textarea id="newFileContent" placeholder="Write something here..."></textarea></div>
        <div class="form-actions"><button class="secondary-btn" id="cancelModal">Cancel</button><button class="primary-btn" id="saveNewFile">Create File</button></div>`);

    let selectedTags = [];

    function renderTagList() {
        $("newFileTagList").innerHTML = selectedTags.map(t => `<span class="tag-pill removable-tag" tag="${escapeHtml(t)}">#${escapeHtml(t)} ×</span>`).join("");
    }

    function addTag(tag) {
        if (tag && !selectedTags.includes(tag)) { selectedTags.push(tag); renderTagList(); }
    }

    $("newFileTagSelect").onchange = () => {
        const value = $("newFileTagSelect").value;
        $("newFileCustomTag").classList.toggle("hidden", value !== "__custom");
        if (value && value !== "__custom") {
            addTag(value);
            $("newFileTagSelect").value = "";
        }
    };

    $("addTagBtn").onclick = () => {
        const custom = $("newFileCustomTag").value.trim().toLowerCase();
        if (custom) { addTag(custom); $("newFileCustomTag").value = ""; }
    };

    $("newFileTagList").onclick = e => {
        const pill = e.target.closest(".removable-tag"); if (!pill) return;
        selectedTags = selectedTags.filter(t => t !== pill.getAttribute("tag"));
        renderTagList();
    };

    $("cancelModal").onclick = closeModal;
    $("saveNewFile").onclick = () => {
        const name = $("newFileName").value.trim();
        const content = $("newFileContent").value;
        const type = $("newFileType").value;
        const category = $("newFileCategory").value;
        if (!name) return alert("Enter a file name.");

        const file = {
            id: safeId(), name, type, category, ownerId: state.userId, editorIds: [], tags: selectedTags,
            size: `${Math.max(1, Math.ceil(new Blob([content]).size / 1024))} KB`,
            modified: nowText(), modifiedAt: Date.now(), content
        };

        state.files.unshift(file);
        persist();
        logAction("created", name, `Created by ${currentUser().name}`);

        closeModal();
        renderRecent();
        if (state.currentView === category) renderCategory(category);
        showToast(`"${name}" was created`, "success");
    };
}

function openNewFolder() {
    openModal(`<h2>Create New Folder</h2><div class="form-group"><label>Folder name</label><input id="newFolderName" placeholder="My Project"></div><div class="form-actions"><button class="secondary-btn" id="cancelModal">Cancel</button><button class="primary-btn" id="saveNewFolder">Create Folder</button></div>`);
    $("cancelModal").onclick = closeModal;
    $("saveNewFolder").onclick = () => {
        const name = $("newFolderName").value.trim();
        if (!name) return alert("Enter a folder name.");

        const category = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        state.folders.push({ name, category, count: 0, icon: "folder", ownerId: state.userId });
        persist();
        logAction("created folder", name);
        closeModal();
        renderFolders();
        showToast(`Folder "${name}" was created`, "success");
    };
}

/* ---------- Opening + previewing files ---------- */

function openFullView(file, blob, url, ext) {
    const imageExts = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"];
    const audioExts = ["mp3", "wav", "m4a", "ogg"];
    const videoExts = ["mp4", "mov", "avi", "webm"];

    if (blob && (imageExts.includes(ext) || audioExts.includes(ext) || videoExts.includes(ext) || ext === "pdf")) {
        window.open(url, "_blank");
        return;
    }

    const previewEl = $("viewerBody");
    const contentHtml = previewEl ? previewEl.innerHTML : "<p>No preview available.</p>";

    const fullViewWindow = window.open("", "_blank");
    if (!fullViewWindow) {
        showToast("Your browser blocked the new tab - please allow pop-ups for this site.", "error");
        return;
    }

    fullViewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${escapeHtml(file.name)}</title>
            <style>
                body { margin:0; padding:40px; background:#111315; color:#f4f0ea; font-family: Poppins, sans-serif; }
                h1 { font-size:18px; font-weight:500; margin-bottom:20px; }
                .full-view-content { max-width:900px; margin:0 auto; white-space:pre-wrap; line-height:1.6; }
                img { max-width:100%; }
            </style>
        </head>
        <body>
            <h1>${escapeHtml(file.name)}</h1>
            <div class="full-view-content">${contentHtml}</div>
        </body>
        </html>
    `);
    fullViewWindow.document.close();
}

async function openFile(id) {
    const file = state.files.find(f => f.id === Number(id)); if (!file) return;

    let blob = null;
    if (file.blobStored) {
        try { blob = await getBlob(file.id); }
        catch (err) { blob = null; }
    }
    const url = blob ? URL.createObjectURL(blob) : "";

    const ext = file.name.split(".").pop().toLowerCase();
    const imageExts = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"];
    const audioExts = ["mp3", "wav", "m4a", "ogg"];
    const videoExts = ["mp4", "mov", "avi", "webm"];

    let body;
    let isDocx = false;

    if (blob && imageExts.includes(ext)) {
        body = `<img class="viewer-image" src="${url}" alt="${escapeHtml(file.name)}">`;
    } else if (blob && audioExts.includes(ext)) {
        body = `<audio class="viewer-media" controls src="${url}"></audio>`;
    } else if (blob && videoExts.includes(ext)) {
        body = `<video class="viewer-media" controls src="${url}"></video>`;
    } else if (blob && ext === "pdf") {
        body = `<iframe class="viewer-frame" src="${url}" title="${escapeHtml(file.name)}"></iframe>`;
    } else if (blob && ext === "docx") {
        isDocx = true;
        body = `<div id="docxPreview" class="viewer-text">Loading document preview...</div>`;
    } else {
        body = `<pre class="viewer-text">${escapeHtml(file.content || "No previewable content saved for this file.")}</pre>`;
    }

    openModal(`<div class="viewer"><div class="viewer-head"><div><span class="viewer-type">${escapeHtml(file.type)}</span><h2>${escapeHtml(file.name)}</h2><p>Owner: ${escapeHtml(fileOwner(file))} · Modified: ${escapeHtml(file.modified)}</p></div><button class="secondary-btn" id="fullViewBtn">Full View</button></div><div id="viewerBody">${body}</div></div>`);

    if (isDocx) {
        try {
            const arrayBuffer = await blob.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            $("docxPreview").innerHTML = result.value || "This document appears to be empty.";
        } catch (err) {
            $("docxPreview").textContent = "Could not preview this Word document - try Download instead.";
        }
    }

    $("fullViewBtn").onclick = () => openFullView(file, blob, url, ext);
    $("modalClose").onclick = () => { if (url) URL.revokeObjectURL(url); closeModal(); };
}

/* ---------- Editing files ---------- */

function renameFile(id) {
    const file = state.files.find(f => f.id === Number(id)); if (!file) return;
    if (!canEditFile(file)) { showToast("You don't have permission to rename this file.", "error"); return; }

    const newName = prompt("Rename file:", file.name);
    if (!newName || !newName.trim()) return;

    const oldName = file.name;
    file.name = newName.trim();
    file.modified = nowText();
    file.modifiedAt = Date.now();
    persist();
    logAction("edited", file.name, `Renamed from "${oldName}"`);
    notifyOwner(file, `${currentUser().name} renamed "${oldName}" to "${file.name}"`);
    renderRecent();
    renderCategory(file.category);
    renderNotifications();
    showToast(`Renamed to "${file.name}"`, "success");
}

function openEditFile(id) {
    const file = state.files.find(f => f.id === Number(id)); if (!file) return;
    if (!canEditFile(file)) { showToast("You only have viewer access to this file.", "error"); return; }
    if (file.blobStored && ["image", "audio", "video"].includes(file.type)) return openFile(id);

    const role = roleForFile(file);
    const existingTags = Array.isArray(file.tags) ? file.tags.join(", ") : "";

    const accessSection = role === "owner"
        ? `<div class="form-group">
             <label>Editors (these people can also edit this file)</label>
             <div class="checkbox-list">
                 ${USERS.filter(u => u.id !== file.ownerId).map(u => `
                     <label class="checkbox-row">
                         <input type="checkbox" class="editor-checkbox" value="${u.id}" ${file.editorIds && file.editorIds.includes(u.id) ? "checked" : ""}>
                         ${escapeHtml(u.name)}
                     </label>`).join("")}
             </div>
           </div>`
        : `<p class="muted-text">Your access level for this file: <strong>${role}</strong></p>`;

    openModal(`<h2>Edit File</h2>
        <p class="muted-text">Editing as <strong>${escapeHtml(currentUser().name)}</strong></p>
        <div class="form-group"><label>File name</label><input id="editFileName" value="${escapeHtml(file.name)}"></div>
        <div class="form-group"><label>Tags (separate with commas)</label><input id="editFileTags" value="${escapeHtml(existingTags)}"></div>
        <div class="form-group"><label>Content</label><textarea id="editFileContent">${escapeHtml(file.content || "")}</textarea></div>
        ${accessSection}
        <div class="form-actions"><button class="secondary-btn" id="cancelModal">Cancel</button><button class="primary-btn" id="saveEditedFile">Save Changes</button></div>`);

    $("cancelModal").onclick = closeModal;
    $("saveEditedFile").onclick = () => {
        const oldName = file.name;
        const name = $("editFileName").value.trim() || oldName;

        file.name = name;
        file.content = $("editFileContent").value;
        file.modified = nowText();
        file.modifiedAt = Date.now();
        file.size = `${Math.max(1, Math.ceil(new Blob([file.content]).size / 1024))} KB`;
        file.tags = $("editFileTags").value.split(",").map(t => t.trim().toLowerCase()).filter(t => t.length > 0);

        if (role === "owner") {
            const checkedBoxes = document.querySelectorAll(".editor-checkbox:checked");
            file.editorIds = Array.from(checkedBoxes).map(box => Number(box.value));
        }

        persist();
        logAction("edited", name, oldName !== name ? `Renamed from ${oldName}` : `Edited by ${currentUser().name}`);
        notifyOwner(file, `${currentUser().name} edited "${name}"`);

        closeModal();
        renderRecent();
        renderCategory(file.category);
        renderNotifications();
        showToast(`"${name}" was updated`, "success");
    };
}

/* ---------- Uploads ---------- */

async function handleUploads(fileList) {
    if (!fileList || fileList.length === 0) return;

    const uploads = Array.from(fileList);

    for (const upload of uploads) {
        const id = safeId();
        const ext = upload.name.split(".").pop().toLowerCase();
        const category = ["mp3", "wav", "m4a", "ogg"].includes(ext) ? "audio" : ["mp4", "mov", "avi", "webm"].includes(ext) ? "videos" : ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext) ? "pictures" : "documents";
        const type = category === "audio" ? "audio" : category === "videos" ? "video" : category === "pictures" ? "image" : "document";

        await saveBlob(id, upload);
        state.files.unshift({
            id, name: upload.name, type, category, ownerId: state.userId, editorIds: [], tags: [],
            size: formatBytes(upload.size), modified: nowText(), modifiedAt: Date.now(),
            content: "", blobStored: true, mime: upload.type
        });
        logAction("uploaded", upload.name, `${currentUser().name} uploaded ${formatBytes(upload.size)}`);
    }

    persist();
    $("fileInput").value = "";
    renderRecent();
    if (["documents", "projects", "pictures", "audio", "videos"].includes(state.currentView)) renderCategory(state.currentView);

    showToast(`${uploads.length} file${uploads.length === 1 ? "" : "s"} uploaded`, "success");
}

/* ---------- Event listeners ---------- */

document.addEventListener("click", e => {
    const nav = e.target.closest(".nav-item"); if (nav) return showView(nav.getAttribute("view"));

    const renameFolderBtn = e.target.closest(".folder-rename-btn"); if (renameFolderBtn) return renameFolder(renameFolderBtn.getAttribute("folder"));
    const deleteFolderBtn = e.target.closest(".folder-delete-btn"); if (deleteFolderBtn) return deleteFolder(deleteFolderBtn.getAttribute("folder"));

    const folder = e.target.closest(".folder-card"); if (folder) return showView(folder.getAttribute("category"));
    const view = e.target.closest("[view]"); if (view) return showView(view.getAttribute("view"));

    const rename = e.target.closest(".rename-file"); if (rename) return renameFile(rename.getAttribute("fileid"));
    const edit = e.target.closest(".edit-file"); if (edit) return openEditFile(edit.getAttribute("fileid"));

    const del = e.target.closest(".delete-file"); if (del) {
        const file = state.files.find(f => f.id === Number(del.getAttribute("fileid"))); if (!file) return;
        if (!canDeleteFile(file)) { showToast("Only the owner can delete this file.", "error"); return; }
        if (!confirm(`Move "${file.name}" to the Recycle Bin?`)) return;

        state.files = state.files.filter(f => f.id !== file.id);
        file.deletedAt = Date.now();
        file.deletedBy = state.userId;
        state.trash.push(file);

        persist();
        logAction("deleted", file.name, `Moved to Recycle Bin by ${currentUser().name}`);
        notifyOwner(file, `${currentUser().name} moved "${file.name}" to the Recycle Bin`);

        renderRecent();
        if (["documents", "projects", "pictures", "audio", "videos"].includes(state.currentView)) renderCategory(state.currentView);
        renderNotifications();
        showToast(`"${file.name}" moved to Recycle Bin`, "success");
        return;
    }

    const restore = e.target.closest(".restore-file"); if (restore) {
        const index = state.trash.findIndex(f => f.id === Number(restore.getAttribute("fileid"))); if (index === -1) return;
        const [file] = state.trash.splice(index, 1);
        delete file.deletedAt;
        delete file.deletedBy;
        state.files.unshift(file);
        persist();
        logAction("restored", file.name, `Restored from Recycle Bin by ${currentUser().name}`);
        notifyOwner(file, `${currentUser().name} restored "${file.name}" from the Recycle Bin`);
        renderTrash(); renderRecent(); renderNotifications();
        showToast(`"${file.name}" restored`, "success");
        return;
    }

    const forever = e.target.closest(".delete-forever"); if (forever) {
        const index = state.trash.findIndex(f => f.id === Number(forever.getAttribute("fileid"))); if (index === -1) return;
        const file = state.trash[index];
        if (file.ownerId !== state.userId) { showToast("Only the owner can permanently delete this file.", "error"); return; }
        if (!confirm(`Permanently delete "${file.name}"? This cannot be undone.`)) return;

        state.trash.splice(index, 1);
        deleteBlob(file.id);
        persist();
        logAction("permanently deleted", file.name);
        renderTrash();
        showToast(`"${file.name}" permanently deleted`, "success");
        return;
    }

    const notifItem = e.target.closest(".notif-item"); if (notifItem && notifItem.getAttribute("notifid")) {
        const note = state.notifications.find(n => n.id === Number(notifItem.getAttribute("notifid")));
        if (note) { note.read = true; save("nexusNotifications", state.notifications); renderNotifications(); }
    }

    const result = e.target.closest(".file-result"); if (result) return openFile(result.getAttribute("fileid"));

    if (!e.target.closest(".profile-wrap")) $("profileMenu").classList.add("hidden");
    if (!e.target.closest(".notif-wrap")) $("notifDropdown").classList.add("hidden");
});

document.addEventListener("dblclick", e => {
    const row = e.target.closest(".file-row");
    if (row && !e.target.closest("button")) openFile(row.getAttribute("fileid"));
});

document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

$("profileBtn").onclick = () => $("profileMenu").classList.toggle("hidden");
$("switchUserSelect").onchange = e => {
    state.userId = Number(e.target.value);
    persist();
    updateProfile();
    renderLogs();
    renderRecent();
    if (["documents", "projects", "pictures", "audio", "videos"].includes(state.currentView)) renderCategory(state.currentView);
    if (state.currentView === "trash") renderTrash();
    renderNotifications();
    $("profileMenu").classList.add("hidden");
};

$("modalClose").onclick = closeModal;
$("modalOverlay").onclick = e => { if (e.target === $("modalOverlay")) closeModal(); };

$("newFileBtn").onclick = openNewFile;
$("newFolderBtn").onclick = openNewFolder;
$("uploadBtn").onclick = () => $("fileInput").click();
$("fileInput").onchange = e => handleUploads(e.target.files);

$("logUserFilter").onchange = renderLogs;
$("searchInput").oninput = e => renderSearch(e.target.value);

$("categoryTagFilter").onchange = () => renderCategory(state.currentView);
$("categorySort").onchange = () => renderCategory(state.currentView);

$("notifBtn").onclick = () => $("notifDropdown").classList.toggle("hidden");
$("markReadBtn").onclick = markAllNotificationsRead;

$("backBtn").onclick = () => { if (state.historyIndex > 0) { state.historyIndex--; showView(state.history[state.historyIndex], false); } };
$("forwardBtn").onclick = () => { if (state.historyIndex < state.history.length - 1) { state.historyIndex++; showView(state.history[state.historyIndex], false); } };

/* ---------- Drag & drop uploads ---------- */

let dragCounter = 0;

window.addEventListener("dragenter", e => {
    e.preventDefault();
    dragCounter++;
    $("dropOverlay").classList.remove("hidden");
});

window.addEventListener("dragover", e => {
    e.preventDefault();
});

window.addEventListener("dragleave", e => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
        dragCounter = 0;
        $("dropOverlay").classList.add("hidden");
    }
});

window.addEventListener("drop", e => {
    e.preventDefault();
    dragCounter = 0;
    $("dropOverlay").classList.add("hidden");

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleUploads(e.dataTransfer.files);
    }
});

/* ---------- Startup ---------- */

updateProfile();
renderFolders();
renderRecent();
renderLogFilter();
renderLogs();
renderNotifications();
purgeExpiredTrash();