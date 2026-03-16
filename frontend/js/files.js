const MAX_STORAGE = 100 * 1024 * 1024;

let files = [];
let fileFolders = [];
let notes = [];
let mindmaps = [];
let currentFilter = 'all';
let currentView = 'grid';
let selectedFileId = null;
let currentFolder = null;
let currentUser = null;

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

function init() {
    redirectIfNotLoggedIn();
    loadUsername();
    loadAllData();
    setupEventListeners();
}

async function loadAllData() {
    try {
        await Promise.all([loadFiles(), loadFileFolders(), loadNotes()]);
        renderFiles();
        updateStorageInfo();
    } catch (e) {
        console.error('Error loading data:', e);
    }
}

async function loadFiles() {
    const res = await fetch('/files', { headers: getAuthHeaders() });
    if (res.ok) {
        files = await res.json();
    }
}

async function loadFileFolders() {
    const res = await fetch('/file-folders', { headers: getAuthHeaders() });
    if (res.ok) {
        fileFolders = await res.json();
    }
}

async function loadNotes() {
    const res = await fetch('/notes', { headers: getAuthHeaders() });
    if (res.ok) {
        notes = await res.json();
        notes.forEach(note => {
            note.type = 'note';
            note.mimeType = 'text/plain';
            note.size = (note.content || '').length;
        });
    }
}

async function saveFiles() {
    await loadFiles();
    updateStorageInfo();
}

function updateStorageInfo() {
    const used = files.reduce((sum, f) => sum + (f.size || 0), 0);
    const usedMB = (used / (1024 * 1024)).toFixed(2);
    const maxMB = (MAX_STORAGE / (1024 * 1024));
    const percent = Math.min((used / MAX_STORAGE) * 100, 100);
    
    document.getElementById('storage-used').style.width = percent + '%';
    document.getElementById('storage-text').textContent = `${usedMB} MB / ${maxMB} MB used`;
}

function setupEventListeners() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });
    }
}

async function handleFiles(fileList) {
    const totalSize = Array.from(fileList).reduce((sum, f) => sum + f.size, 0);
    const currentUsed = files.reduce((sum, f) => sum + (f.size || 0), 0);
    
    if (currentUsed + totalSize > MAX_STORAGE) {
        alert('Not enough storage space!');
        return;
    }

    for (const file of Array.from(fileList)) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const fileData = {
                name: file.name,
                type: getFileType(file.name),
                mimeType: file.type,
                size: file.size,
                data: e.target.result.split(',')[1],
                folder_id: currentFolder
            };
            
            const res = await fetch('/files', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(fileData)
            });
            
            if (res.ok) {
                await loadFiles();
                renderFiles();
            }
        };
        reader.readAsDataURL(file);
    }

    closeUploadModal();
    showUploadSuccess(fileList.length);
}

function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const typeMap = {
        'note': ['txt', 'md', 'note', 'text'],
        'mindmap': ['mm', 'mindmap', 'json'],
        'document': ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
        'image': ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
        'video': ['mp4', 'webm', 'avi', 'mov'],
        'audio': ['mp3', 'wav', 'ogg', 'm4a'],
        'archive': ['zip', 'rar', '7z', 'tar', 'gz']
    };
    
    for (const [type, exts] of Object.entries(typeMap)) {
        if (exts.includes(ext)) return type;
    }
    return 'document';
}

function getFileIcon(type) {
    const icons = {
        'note': '📓',
        'mindmap': '🧠',
        'document': '📄',
        'image': '🖼️',
        'video': '🎬',
        'audio': '🎵',
        'archive': '📦',
        'folder': '📁'
    };
    return icons[type] || '📄';
}

function getFileSize(bytes) {
    if (!bytes || bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function filterFiles(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderFiles();
}

function setView(view) {
    currentView = view;
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    document.getElementById('files-grid').classList.toggle('hidden', view !== 'grid');
    document.getElementById('files-list').classList.toggle('hidden', view !== 'list');
}

function renderFiles() {
    let filtered = [];
    
    if (currentFilter === 'all') {
        filtered = [...files, ...notes];
    } else if (currentFilter === 'note') {
        filtered = notes;
    } else if (currentFilter === 'mindmap') {
        filtered = files.filter(f => f.type === 'mindmap');
    } else {
        filtered = files.filter(f => f.type === currentFilter);
    }

    if (currentFolder) {
        filtered = filtered.filter(f => f.folder_id === currentFolder);
    }

    const grid = document.getElementById('files-grid');
    const list = document.getElementById('list-content');
    const empty = document.getElementById('empty-state');

    if (filtered.length === 0 && fileFolders.length === 0) {
        grid.innerHTML = '';
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');

    const folderHtml = fileFolders.filter(f => f.parent_id === currentFolder).map(folder => `
        <div class="file-card folder-card" onclick="openFolder(${folder.id})">
            <div class="file-icon">📁</div>
            <div class="file-name">${escapeHtml(folder.name)}</div>
            <div class="file-meta">Folder</div>
            <div class="file-actions">
                <button onclick="event.stopPropagation(); renameFolder(${folder.id})" title="Rename">✏️</button>
                <button onclick="event.stopPropagation(); deleteFolder(${folder.id})" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');

    const fileHtml = filtered.map(file => `
        <div class="file-card" onclick="openFile(${file.id})" oncontextmenu="showFileMenu(event, ${file.id}, '${file.type}')">
            <div class="file-icon">${getFileIcon(file.type)}</div>
            <div class="file-name">${escapeHtml(file.name)}</div>
            <div class="file-meta">${getFileSize(file.size)}</div>
            <div class="file-actions">
                <button onclick="event.stopPropagation(); openFile(${file.id})" title="Open">👁️</button>
                <button onclick="event.stopPropagation(); showFileInfo(${file.id})" title="Info">ℹ️</button>
                <button onclick="event.stopPropagation(); printFile(${file.id})" title="Print">🖨️</button>
                <button onclick="event.stopPropagation(); deleteFile(${file.id})" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');

    grid.innerHTML = folderHtml + fileHtml;

    const listFolderHtml = fileFolders.filter(f => f.parent_id === currentFolder).map(folder => `
        <div class="list-row" onclick="openFolder(${folder.id})">
            <span class="col-name"><span class="type-icon">📁</span> ${escapeHtml(folder.name)}</span>
            <span class="col-type">Folder</span>
            <span class="col-size">-</span>
            <span class="col-date">${formatDate(folder.created_at)}</span>
            <span class="col-actions">
                <button onclick="event.stopPropagation(); renameFolder(${folder.id})">✏️</button>
                <button onclick="event.stopPropagation(); deleteFolder(${folder.id})">🗑️</button>
            </span>
        </div>
    `).join('');

    const listFileHtml = filtered.map(file => `
        <div class="list-row" onclick="openFile(${file.id})">
            <span class="col-name"><span class="type-icon">${getFileIcon(file.type)}</span> ${escapeHtml(file.name)}</span>
            <span class="col-type">${file.type}</span>
            <span class="col-size">${getFileSize(file.size)}</span>
            <span class="col-date">${formatDate(file.modified_at || file.updated_at)}</span>
            <span class="col-actions">
                <button onclick="event.stopPropagation(); openFile(${file.id})">👁️</button>
                <button onclick="event.stopPropagation(); showFileInfo(${file.id})">ℹ️</button>
                <button onclick="event.stopPropagation(); printFile(${file.id})">🖨️</button>
                <button onclick="event.stopPropagation(); deleteFile(${file.id})">🗑️</button>
            </span>
        </div>
    `).join('');

    list.innerHTML = listFolderHtml + listFileHtml;
}

async function openFile(id) {
    selectedFileId = id;
    
    let file = files.find(f => f.id === id);
    if (!file) {
        file = notes.find(n => n.id === id);
        if (file) {
            file = { ...file, data: btoa(file.content || ''), mimeType: 'text/plain' };
        }
    }
    if (!file) return;

    document.getElementById('preview-title').textContent = file.name;
    const content = document.getElementById('preview-content');

    if (file.type === 'image') {
        const res = await fetch(`/files/${id}`, { headers: getAuthHeaders() });
        const fileData = await res.json();
        content.innerHTML = `<img src="data:${fileData.mime_type};base64,${fileData.data}" alt="${file.name}">`;
    } else if (file.type === 'note' || file.mimeType === 'text/plain') {
        let text = '';
        if (file.data) {
            try {
                text = atob(file.data);
            } catch(e) {
                text = file.content || '';
            }
        }
        content.innerHTML = `<pre>${escapeHtml(text)}</pre>`;
    } else if (file.type === 'mindmap') {
        try {
            const res = await fetch(`/files/${id}`, { headers: getAuthHeaders() });
            const fileData = await res.json();
            const data = JSON.parse(atob(fileData.data));
            content.innerHTML = `<div class="mindmap-preview"><p>🧠 Mind Map: ${data.nodes?.length || 0} nodes</p><pre>${JSON.stringify(data, null, 2)}</pre></div>`;
        } catch(e) {
            content.innerHTML = '<p>Unable to preview this file</p>';
        }
    } else if (file.mime_type === 'application/pdf') {
        const res = await fetch(`/files/${id}`, { headers: getAuthHeaders() });
        const fileData = await res.json();
        content.innerHTML = `<iframe src="data:${fileData.mime_type};base64,${fileData.data}"></iframe>`;
    } else {
        content.innerHTML = `
            <div class="preview-placeholder">
                <span class="icon">${getFileIcon(file.type)}</span>
                <p>Preview not available</p>
                <button onclick="downloadFile()" class="btn primary">Download to View</button>
            </div>
        `;
    }

    document.getElementById('preview-modal').classList.remove('hidden');
}

function closePreviewModal() {
    document.getElementById('preview-modal').classList.add('hidden');
    selectedFileId = null;
}

async function showFileInfo(id) {
    let file = files.find(f => f.id === id);
    if (!file) {
        file = notes.find(n => n.id === id);
    }
    if (!file) return;

    const content = document.getElementById('file-info-content');
    content.innerHTML = `
        <div class="info-row">
            <label>Name:</label>
            <span>${escapeHtml(file.name)}</span>
        </div>
        <div class="info-row">
            <label>Type:</label>
            <span>${file.type}</span>
        </div>
        <div class="info-row">
            <label>Size:</label>
            <span>${getFileSize(file.size)}</span>
        </div>
        <div class="info-row">
            <label>Created:</label>
            <span>${formatDate(file.created_at)}</span>
        </div>
        <div class="info-row">
            <label>Modified:</label>
            <span>${formatDate(file.modified_at || file.updated_at)}</span>
        </div>
        <div class="info-actions">
            <button onclick="downloadFile()" class="btn primary">⬇️ Download</button>
            <button onclick="printFile(${file.id})" class="btn">🖨️ Print</button>
            <button onclick="deleteFile(${file.id}); closeInfoModal()" class="btn danger">🗑️ Delete</button>
        </div>
    `;

    document.getElementById('info-modal').classList.remove('hidden');
}

function closeInfoModal() {
    document.getElementById('info-modal').classList.add('hidden');
}

async function deleteFile(id) {
    if (!confirm('Delete this file? This cannot be undone.')) return;

    const res = await fetch(`/files/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });

    if (res.ok) {
        await loadFiles();
        renderFiles();
    }
}

async function downloadFile() {
    if (!selectedFileId) return;
    
    let file = files.find(f => f.id === selectedFileId);
    if (!file) {
        file = notes.find(n => n.id === selectedFileId);
        if (file) {
            file = { ...file, data: btoa(file.content || '') };
        }
    }
    if (!file) return;

    const res = await fetch(`/files/${selectedFileId}`, { headers: getAuthHeaders() });
    const fileData = await res.json();
    
    const link = document.createElement('a');
    link.href = `data:${fileData.mime_type || 'application/octet-stream'};base64,${fileData.data}`;
    link.download = file.name;
    link.click();
}

async function printFile(id) {
    let file = files.find(f => f.id === id);
    if (!file) {
        file = notes.find(n => n.id === id);
        if (file) {
            const res = await fetch(`/notes/${id}`, { headers: getAuthHeaders() });
            const noteData = await res.json();
            file = { 
                ...file, 
                name: `${noteData.title}.txt`,
                data: btoa(noteData.content || ''),
                mimeType: 'text/plain'
            };
        }
    }
    if (!file) return;

    if (file.type === 'image') {
        const res = await fetch(`/files/${id}`, { headers: getAuthHeaders() });
        const fileData = await res.json();
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html><head><title>${file.name}</title></head>
            <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;">
                <img src="data:${fileData.mime_type};base64,${fileData.data}" style="max-width:100%;max-height:100vh;">
            </body></html>
        `);
        printWindow.document.close();
        printWindow.print();
    } else {
        const res = await fetch(`/files/${id}`, { headers: getAuthHeaders() });
        const fileData = await res.json();
        const content = fileData.data ? atob(fileData.data) : '';
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html><head><title>${file.name}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; white-space: pre-wrap; }
            </style>
            </head><body>${escapeHtml(content)}</body></html>
        `);
        printWindow.document.close();
        printWindow.print();
    }
}

function openUploadModal() {
    document.getElementById('upload-modal').classList.remove('hidden');
    document.getElementById('file-input').value = '';
}

function closeUploadModal() {
    document.getElementById('upload-modal').classList.add('hidden');
}

function showUploadSuccess(count) {
    alert(`✅ ${count} file(s) uploaded successfully!`);
}

function createNewFile() {
    document.getElementById('folder-modal').classList.remove('hidden');
    document.getElementById('folder-name-input').value = '';
    document.getElementById('folder-name-input').focus();
}

function closeFolderModal() {
    document.getElementById('folder-modal').classList.add('hidden');
}

async function confirmCreateFolder() {
    const name = document.getElementById('folder-name-input').value.trim();
    if (!name) return alert('Please enter a folder name');

    const res = await fetch('/file-folders', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: name, parent_id: currentFolder })
    });

    if (res.ok) {
        await loadFileFolders();
        renderFiles();
        closeFolderModal();
    }
}

async function openFolder(folderId) {
    currentFolder = folderId;
    const folder = fileFolders.find(f => f.id === folderId);
    document.getElementById('current-folder-name').textContent = folder ? folder.name : 'My Files';
    renderFiles();
}

async function deleteFolder(id) {
    if (!confirm('Delete this folder and all its contents? This cannot be undone.')) return;

    const res = await fetch(`/file-folders/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });

    if (res.ok) {
        await loadFileFolders();
        await loadFiles();
        currentFolder = null;
        document.getElementById('current-folder-name').textContent = 'My Files';
        renderFiles();
    }
}

async function renameFolder(id) {
    const folder = fileFolders.find(f => f.id === id);
    if (!folder) return;
    
    const newName = prompt('Enter new folder name:', folder.name);
    if (!newName || newName === folder.name) return;

    const res = await fetch(`/file-folders/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: newName })
    });

    if (res.ok) {
        await loadFileFolders();
        renderFiles();
    }
}

async function importNotesToFiles() {
    if (notes.length === 0) {
        alert('No notes to import!');
        return;
    }

    let imported = 0;
    for (const note of notes) {
        const res = await fetch(`/files/import-note/${note.id}`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        if (res.ok) imported++;
    }

    alert(`✅ Imported ${imported} note(s) to files!`);
    await loadFiles();
    renderFiles();
}

function showFileMenu(event, id, type) {
    event.preventDefault();
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
