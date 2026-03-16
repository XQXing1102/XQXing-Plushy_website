const STORAGE_KEY = 'mindmap_data';
const FOLDER_STORAGE_KEY = 'mindmap_folders';

let folders = [];
let currentFolderId = null;
let mindmaps = [];
let currentMindmapId = null;

let nodes = [];
let nextId = 1;
let mindmapName = 'Untitled';
let draggingNode = null;
let dragOffset = { x: 0, y: 0 };
let editingNodeId = null;
let selectedNodeId = null;

let scale = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let lastPan = { x: 0, y: 0 };

const DEFAULT_STYLES = {
    shape: 'rounded',
    bgColor: '#6366f1',
    textColor: '#ffffff',
    fontSize: '14',
    fontFamily: 'Inter, sans-serif',
    minWidth: 80,
    minHeight: 36
};

function init() {
    redirectIfNotLoggedIn();
    loadUsername();
    loadFolders();
    setupEventListeners();
}

function openMindMap() {
    document.getElementById('mindmap-modal').classList.remove('hidden');
    if (folders.length === 0) createDefaultFolder();
    renderFolderList();
    renderMindmapList();
    loadCurrentMindmap();
}

function closeMindMap() {
    document.getElementById('mindmap-modal').classList.add('hidden');
}

function loadFolders() {
    const saved = localStorage.getItem(FOLDER_STORAGE_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            folders = data.folders || [];
            currentFolderId = data.currentFolderId;
        } catch (e) {
            folders = [];
        }
    }
    if (folders.length === 0) createDefaultFolder();
    if (!currentFolderId) currentFolderId = folders[0].id;
}

function saveFolders() {
    localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify({
        folders,
        currentFolderId
    }));
}

function createDefaultFolder() {
    const folder = {
        id: Date.now(),
        name: 'Default',
        createdAt: new Date().toISOString()
    };
    folders.push(folder);
    currentFolderId = folder.id;
    saveFolders();
}

function createFolder() {
    const name = prompt('Enter folder name:');
    if (!name || !name.trim()) return;
    
    const folder = {
        id: Date.now(),
        name: name.trim(),
        createdAt: new Date().toISOString()
    };
    folders.push(folder);
    saveFolders();
    renderFolderList();
}

function deleteFolder(id) {
    if (folders.length <= 1) {
        alert('Cannot delete the last folder');
        return;
    }
    if (!confirm('Delete this folder and all its mindmaps?')) return;
    
    const folder = folders.find(f => f.id === id);
    if (folder) {
        localStorage.removeItem(`mindmap_${id}`);
    }
    
    folders = folders.filter(f => f.id !== id);
    if (currentFolderId === id) {
        currentFolderId = folders[0].id;
    }
    saveFolders();
    renderFolderList();
    renderMindmapList();
    loadCurrentMindmap();
}

function renameFolder(id) {
    const folder = folders.find(f => f.id === id);
    if (!folder) return;
    
    const newName = prompt('Enter new folder name:', folder.name);
    if (newName && newName.trim()) {
        folder.name = newName.trim();
        saveFolders();
        renderFolderList();
    }
}

function selectFolder(id) {
    saveCurrentMindmap();
    currentFolderId = id;
    saveFolders();
    renderFolderList();
    renderMindmapList();
    loadCurrentMindmap();
}

function renderFolderList() {
    const container = document.getElementById('folder-list');
    container.innerHTML = folders.map(folder => `
        <div class="folder-item ${folder.id === currentFolderId ? 'active' : ''}" onclick="selectFolder(${folder.id})">
            <span class="folder-icon">📁</span>
            <span class="folder-name">${escapeHtml(folder.name)}</span>
            <div class="folder-actions">
                <button onclick="event.stopPropagation(); renameFolder(${folder.id})" title="Rename">✏️</button>
                <button onclick="event.stopPropagation(); deleteFolder(${folder.id})" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');
}

function createMindmap() {
    const name = prompt('Enter mindmap name:', 'New Mind Map');
    if (!name || !name.trim()) return;
    
    const key = `mindmap_${currentFolderId}`;
    const data = JSON.parse(localStorage.getItem(key) || '{"mindmaps":[]}');
    
    const mindmap = {
        id: Date.now(),
        name: name.trim(),
        nodes: [{
            id: 1,
            text: 'Main Idea',
            x: 300,
            y: 200,
            parentId: null,
            children: [],
            style: { ...DEFAULT_STYLES, shape: 'rounded', bgColor: '#f59e0b' }
        }],
        nextId: 2,
        createdAt: new Date().toISOString()
    };
    
    data.mindmaps.push(mindmap);
    localStorage.setItem(key, JSON.stringify(data));
    
    renderMindmapList();
    loadMindmap(mindmap.id);
}

function deleteMindmap(id) {
    if (!confirm('Delete this mindmap?')) return;
    
    const key = `mindmap_${currentFolderId}`;
    const data = JSON.parse(localStorage.getItem(key) || '{"mindmaps":[]}');
    
    data.mindmaps = data.mindmaps.filter(m => m.id !== id);
    localStorage.setItem(key, JSON.stringify(data));
    
    if (currentMindmapId === id) {
        currentMindmapId = null;
        nodes = [];
        nextId = 1;
        mindmapName = 'Untitled';
        render();
    }
    
    renderMindmapList();
}

function renameMindmap(id) {
    const key = `mindmap_${currentFolderId}`;
    const data = JSON.parse(localStorage.getItem(key) || '{"mindmaps":[]}');
    const mindmap = data.mindmaps.find(m => m.id === id);
    if (!mindmap) return;
    
    const newName = prompt('Enter new name:', mindmap.name);
    if (newName && newName.trim()) {
        mindmap.name = newName.trim();
        localStorage.setItem(key, JSON.stringify(data));
        renderMindmapList();
        if (currentMindmapId === id) {
            mindmapName = mindmap.name;
            document.getElementById('mindmap-name-display').textContent = mindmapName;
        }
    }
}

function loadMindmap(id) {
    saveCurrentMindmap();
    
    currentMindmapId = id;
    const key = `mindmap_${currentFolderId}`;
    const data = JSON.parse(localStorage.getItem(key) || '{"mindmaps":[]}');
    const mindmap = data.mindmaps.find(m => m.id === id);
    
    if (mindmap) {
        nodes = mindmap.nodes || [];
        nextId = mindmap.nextId || 1;
        mindmapName = mindmap.name || 'Untitled';
    } else {
        nodes = [];
        nextId = 1;
        mindmapName = 'Untitled';
    }
    
    document.getElementById('mindmap-name-display').textContent = mindmapName;
    renderMindmapList();
    render();
}

function loadCurrentMindmap() {
    const key = `mindmap_${currentFolderId}`;
    const data = JSON.parse(localStorage.getItem(key) || '{"mindmaps":[]}');
    
    if (data.mindmaps && data.mindmaps.length > 0) {
        loadMindmap(data.mindmaps[0].id);
    } else {
        currentMindmapId = null;
        nodes = [];
        nextId = 1;
        mindmapName = 'Untitled';
        document.getElementById('mindmap-name-display').textContent = 'No Mind Map';
        render();
    }
}

function saveCurrentMindmap() {
    if (!currentMindmapId) return;
    
    const key = `mindmap_${currentFolderId}`;
    const data = JSON.parse(localStorage.getItem(key) || '{"mindmaps":[]}');
    const mindmap = data.mindmaps.find(m => m.id === currentMindmapId);
    
    if (mindmap) {
        mindmap.nodes = nodes;
        mindmap.nextId = nextId;
        mindmap.name = mindmapName;
    } else {
        data.mindmaps.push({
            id: currentMindmapId,
            name: mindmapName,
            nodes,
            nextId,
            createdAt: new Date().toISOString()
        });
    }
    
    localStorage.setItem(key, JSON.stringify(data));
}

function renderMindmapList() {
    const container = document.getElementById('mindmap-list');
    const key = `mindmap_${currentFolderId}`;
    const data = JSON.parse(localStorage.getItem(key) || '{"mindmaps":[]}');
    
    if (!data.mindmaps || data.mindmaps.length === 0) {
        container.innerHTML = '<div class="no-mindmaps">No mindmaps yet</div>';
        return;
    }
    
    container.innerHTML = data.mindmaps.map(mm => `
        <div class="mindmap-item ${mm.id === currentMindmapId ? 'active' : ''}" onclick="loadMindmap(${mm.id})">
            <span class="mm-icon">🧠</span>
            <span class="mm-name">${escapeHtml(mm.name)}</span>
            <div class="mm-actions">
                <button onclick="event.stopPropagation(); renameMindmap(${mm.id})" title="Rename">✏️</button>
                <button onclick="event.stopPropagation(); deleteMindmap(${mm.id})" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renameMindMap() {
    const newName = prompt('Enter mind map name:', mindmapName);
    if (newName && newName.trim()) {
        mindmapName = newName.trim();
        document.getElementById('mindmap-name-display').textContent = mindmapName;
        saveCurrentMindmap();
    }
}

function addCentralNode() {
    const canvas = document.getElementById('mindmap-canvas');
    const centerX = canvas.offsetWidth / 2;
    const centerY = canvas.offsetHeight / 2;
    
    const node = {
        id: nextId++,
        text: 'Main Idea',
        x: centerX - 80,
        y: centerY - 30,
        parentId: null,
        children: [],
        style: { ...DEFAULT_STYLES, shape: 'rounded', bgColor: '#f59e0b' }
    };
    nodes.push(node);
    saveCurrentMindmap();
    render();
}

function addChildNode(parentId, direction = null) {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;

    let x, y;
    const distance = 180;
    
    if (direction) {
        switch(direction) {
            case 'left':
                x = parent.x - distance;
                y = parent.y;
                break;
            case 'right':
                x = parent.x + distance;
                y = parent.y;
                break;
            case 'top':
                x = parent.x;
                y = parent.y - distance;
                break;
            case 'bottom':
                x = parent.x;
                y = parent.y + distance;
                break;
            default:
                x = parent.x + (Math.random() - 0.5) * distance;
                y = parent.y + (Math.random() - 0.5) * distance;
        }
    } else {
        const angle = (Math.random() * Math.PI * 2);
        x = parent.x + Math.cos(angle) * distance;
        y = parent.y + Math.sin(angle) * distance;
    }
    
    const child = {
        id: nextId++,
        text: 'New Idea',
        x: x,
        y: y,
        parentId: parentId,
        children: [],
        style: { ...DEFAULT_STYLES }
    };
    
    nodes.push(child);
    parent.children.push(child.id);
    saveCurrentMindmap();
    render();
    
    setTimeout(() => startEditing(child.id), 100);
}

function addBranchMenu(parentId, event) {
    event.stopPropagation();
    selectedNodeId = parentId;
    
    const menu = document.getElementById('branch-menu');
    menu.style.left = event.clientX + 'px';
    menu.style.top = event.clientY + 'px';
    menu.classList.add('active');
}

function hideBranchMenu() {
    document.getElementById('branch-menu').classList.remove('active');
}

function addBranch(direction) {
    if (selectedNodeId) {
        addChildNode(selectedNodeId, direction);
        hideBranchMenu();
    }
}

function updateNodeText(id, text) {
    const node = nodes.find(n => n.id === id);
    if (node) {
        node.text = text || 'Untitled';
        saveCurrentMindmap();
    }
}

function updateNodeStyle(id, style) {
    const node = nodes.find(n => n.id === id);
    if (node) {
        node.style = { ...node.style, ...style };
        saveCurrentMindmap();
        render();
    }
}

function deleteNode(id) {
    const node = nodes.find(n => n.id === id);
    if (!node || node.parentId === null) {
        alert('Cannot delete central node');
        return;
    }

    function collectDescendants(nodeId) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return [];
        let ids = [nodeId];
        node.children.forEach(childId => {
            ids = ids.concat(collectDescendants(childId));
        });
        return ids;
    }

    const toDelete = collectDescendants(id);
    nodes = nodes.filter(n => !toDelete.includes(n.id));

    const parent = nodes.find(n => n.children.includes(id));
    if (parent) {
        parent.children = parent.children.filter(c => c !== id);
    }

    saveCurrentMindmap();
    selectedNodeId = null;
    hideStyleEditor();
    render();
}

function startEditing(id) {
    editingNodeId = id;
    const node = nodes.find(n => n.id === id);
    if (!node) return;

    const editor = document.getElementById('mm-editor');
    const input = document.getElementById('mm-edit-input');
    
    input.value = node.text;
    editor.classList.add('active');
    input.focus();
    input.select();
}

function saveNodeEdit() {
    if (editingNodeId === null) return;
    
    const input = document.getElementById('mm-edit-input');
    updateNodeText(editingNodeId, input.value);
    
    cancelNodeEdit();
}

function cancelNodeEdit() {
    editingNodeId = null;
    document.getElementById('mm-editor').classList.remove('active');
    document.getElementById('mm-edit-input').value = '';
}

function openStyleEditor(id) {
    selectedNodeId = id;
    const node = nodes.find(n => n.id === id);
    if (!node) return;

    const editor = document.getElementById('style-editor');
    const style = node.style || DEFAULT_STYLES;

    document.getElementById('shape-select').value = style.shape || 'rounded';
    document.getElementById('bg-color').value = style.bgColor || '#6366f1';
    document.getElementById('text-color').value = style.textColor || '#ffffff';
    document.getElementById('font-size').value = style.fontSize || '14';
    document.getElementById('font-family').value = style.fontFamily || 'Inter, sans-serif';
    document.getElementById('node-width').value = style.width || '';
    document.getElementById('node-height').value = style.height || '';
    document.getElementById('node-min-width').value = style.minWidth || '';
    document.getElementById('node-min-height').value = style.minHeight || '';

    editor.classList.add('active');
    hideBranchMenu();
}

function hideStyleEditor() {
    selectedNodeId = null;
    document.getElementById('style-editor').classList.remove('active');
}

function saveStyle() {
    if (selectedNodeId === null) return;

    const style = {
        shape: document.getElementById('shape-select').value,
        bgColor: document.getElementById('bg-color').value,
        textColor: document.getElementById('text-color').value,
        fontSize: document.getElementById('font-size').value,
        fontFamily: document.getElementById('font-family').value,
        width: document.getElementById('node-width').value ? parseInt(document.getElementById('node-width').value) : null,
        height: document.getElementById('node-height').value ? parseInt(document.getElementById('node-height').value) : null,
        minWidth: document.getElementById('node-min-width').value ? parseInt(document.getElementById('node-min-width').value) : null,
        minHeight: document.getElementById('node-min-height').value ? parseInt(document.getElementById('node-min-height').value) : null
    };

    updateNodeStyle(selectedNodeId, style);
}

function autoApplyStyle() {
    saveStyle();
}

function getShapeClass(shape) {
    switch(shape) {
        case 'rounded': return 'shape-rounded';
        case 'square': return 'shape-square';
        case 'pill': return 'shape-pill';
        case 'circle': return 'shape-circle';
        case 'diamond': return 'shape-diamond';
        case 'hexagon': return 'shape-hexagon';
        case 'cloud': return 'shape-cloud';
        default: return 'shape-rounded';
    }
}

function showNodeControls(id) {
    const nodeEl = document.querySelector(`.mm-node[data-id="${id}"]`);
    if (nodeEl) {
        nodeEl.classList.add('show-controls');
    }
}

function hideNodeControls(id) {
    const nodeEl = document.querySelector(`.mm-node[data-id="${id}"]`);
    if (nodeEl) {
        nodeEl.classList.remove('show-controls');
    }
}

function render() {
    const nodesLayer = document.getElementById('mm-nodes');
    const connectionsLayer = document.getElementById('mm-connections');
    
    if (!nodesLayer || !connectionsLayer) return;
    
    nodesLayer.innerHTML = '';
    connectionsLayer.innerHTML = '';

    nodes.forEach(node => {
        const el = document.createElement('div');
        const style = node.style || DEFAULT_STYLES;
        
        el.className = `mm-node ${getShapeClass(style.shape)} ${node.parentId === null ? 'central' : ''}`;
        if (node.id === selectedNodeId) el.classList.add('selected');
        
        el.style.left = (node.x * scale + panX) + 'px';
        el.style.top = (node.y * scale + panY) + 'px';
        el.style.background = style.bgColor;
        el.style.color = style.textColor;
        el.style.fontSize = style.fontSize + 'px';
        el.style.fontFamily = style.fontFamily;
        if (style.width) el.style.width = style.width + 'px';
        if (style.height) el.style.height = style.height + 'px';
        if (style.minWidth) el.style.minWidth = style.minWidth + 'px';
        if (style.minHeight) el.style.minHeight = style.minHeight + 'px';
        
        el.innerHTML = `
            <span class="mm-node-text">${escapeHtml(node.text)}</span>
            <div class="mm-node-controls">
                <button class="mm-control-btn top" onclick="event.stopPropagation(); addChildNode(${node.id}, 'top')" title="Add above">+</button>
                <button class="mm-control-btn right" onclick="event.stopPropagation(); addChildNode(${node.id}, 'right')" title="Add right">+</button>
                <button class="mm-control-btn bottom" onclick="event.stopPropagation(); addChildNode(${node.id}, 'bottom')" title="Add below">+</button>
                <button class="mm-control-btn left" onclick="event.stopPropagation(); addChildNode(${node.id}, 'left')" title="Add left">+</button>
                <button class="mm-control-btn style" onclick="event.stopPropagation(); openStyleEditor(${node.id})" title="Edit style">✎</button>
            </div>
        `;
        el.dataset.id = node.id;

        el.addEventListener('mousedown', (e) => handleNodeMouseDown(e, node.id));
        el.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            addChildNode(node.id);
        });
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            startEditing(node.id);
        });
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (node.parentId !== null) {
                deleteNode(node.id);
            }
        });
        el.addEventListener('mouseenter', () => showNodeControls(node.id));
        el.addEventListener('mouseleave', () => hideNodeControls(node.id));

        nodesLayer.appendChild(el);
    });

    nodes.forEach(node => {
        if (node.parentId !== null) {
            const parent = nodes.find(n => n.id === node.parentId);
            if (parent) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                const parentEl = nodesLayer.querySelector(`[data-id="${parent.id}"]`);
                const nodeEl = nodesLayer.querySelector(`[data-id="${node.id}"]`);
                
                if (parentEl && nodeEl) {
                    const parentRect = parentEl.getBoundingClientRect();
                    const nodeRect = nodeEl.getBoundingClientRect();
                    const canvasRect = document.getElementById('mindmap-canvas').getBoundingClientRect();
                    
                    line.setAttribute('x1', parentRect.left - canvasRect.left + parentRect.width/2);
                    line.setAttribute('y1', parentRect.top - canvasRect.top + parentRect.height/2);
                    line.setAttribute('x2', nodeRect.left - canvasRect.left + nodeRect.width/2);
                    line.setAttribute('y2', nodeRect.top - canvasRect.top + nodeRect.height/2);
                }
                line.setAttribute('class', 'mm-connection-line');
                connectionsLayer.appendChild(line);
            }
        }
    });
}

let autoSaveTimeout;
function triggerAutoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        saveCurrentMindmap();
    }, 1000);
}

function handleNodeMouseDown(e, id) {
    if (e.button !== 0) return;
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        openStyleEditor(id);
        return;
    }
    if (e.altKey) {
        e.preventDefault();
        selectedNodeId = id;
        render();
        return;
    }
    
    draggingNode = id;
    const node = nodes.find(n => n.id === id);
    const rect = e.target.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    e.stopPropagation();
}

function handleCanvasMouseMove(e) {
    if (draggingNode !== null) {
        const canvas = document.getElementById('mindmap-canvas');
        const rect = canvas.getBoundingClientRect();
        
        const node = nodes.find(n => n.id === draggingNode);
        if (node) {
            node.x = (e.clientX - rect.left) / scale - dragOffset.x;
            node.y = (e.clientY - rect.top) / scale - dragOffset.y;
            triggerAutoSave();
            render();
        }
    } else if (isPanning) {
        panX = e.clientX - lastPan.x;
        panY = e.clientY - lastPan.y;
        render();
    }
}

function handleCanvasMouseUp() {
    if (draggingNode !== null) {
        saveCurrentMindmap();
    }
    draggingNode = null;
    isPanning = false;
}

function handleCanvasMouseDown(e) {
    if (e.target.id === 'mindmap-canvas' || e.target.id === 'mm-nodes') {
        isPanning = true;
        lastPan.x = e.clientX - panX;
        lastPan.y = e.clientY - panY;
        hideStyleEditor();
        hideBranchMenu();
    }
}

function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    scale = Math.max(0.3, Math.min(2, scale * delta));
    render();
}

function resetView() {
    scale = 1;
    panX = 0;
    panY = 0;
    render();
}

function clearMindMap() {
    if (confirm('Clear all nodes? This cannot be undone.')) {
        nodes = [{
            id: nextId = 1,
            text: 'Main Idea',
            x: 300,
            y: 200,
            parentId: null,
            children: [],
            style: { ...DEFAULT_STYLES, shape: 'rounded', bgColor: '#f59e0b' }
        }];
        mindmapName = 'Untitled';
        document.getElementById('mindmap-name-display').textContent = mindmapName;
        saveCurrentMindmap();
        render();
    }
}

async function exportToImage() {
    const canvas = document.getElementById('mindmap-canvas');
    
    try {
        const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
        
        const exportDiv = document.createElement('div');
        exportDiv.style.position = 'absolute';
        exportDiv.style.left = '-9999px';
        exportDiv.style.background = '#151515';
        exportDiv.style.padding = '40px';
        exportDiv.style.width = canvas.offsetWidth + 'px';
        exportDiv.style.height = canvas.offsetHeight + 'px';
        
        const title = document.createElement('h2');
        title.textContent = mindmapName;
        title.style.color = '#fff';
        title.style.marginBottom = '20px';
        title.style.fontFamily = 'Inter, sans-serif';
        exportDiv.appendChild(title);
        
        const clonedCanvas = canvas.cloneNode(true);
        exportDiv.appendChild(clonedCanvas);
        document.body.appendChild(exportDiv);
        
        const result = await html2canvas(exportDiv, {
            backgroundColor: '#151515',
            scale: 2
        });
        
        const link = document.createElement('a');
        link.download = `${mindmapName.replace(/\s+/g, '_')}.png`;
        link.href = result.toDataURL('image/png');
        link.click();
        
        document.body.removeChild(exportDiv);
    } catch (e) {
        alert('Export failed: ' + e.message);
    }
}

async function exportToPDF() {
    const canvas = document.getElementById('mindmap-canvas');
    
    try {
        const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
        
        const exportDiv = document.createElement('div');
        exportDiv.style.position = 'absolute';
        exportDiv.style.left = '-9999px';
        exportDiv.style.background = '#fff';
        exportDiv.style.padding = '40px';
        
        const title = document.createElement('h1');
        title.textContent = mindmapName;
        title.style.color = '#000';
        title.style.marginBottom = '20px';
        exportDiv.appendChild(title);
        
        const clonedCanvas = canvas.cloneNode(true);
        clonedCanvas.style.background = '#fff';
        exportDiv.appendChild(clonedCanvas);
        document.body.appendChild(exportDiv);
        
        const result = await html2canvas(exportDiv, { scale: 2 });
        
        const { jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm');
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        const imgData = result.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth - 20, (result.height * (pdfWidth - 20)) / result.width);
        pdf.save(`${mindmapName.replace(/\s+/g, '_')}.pdf`);
        
        document.body.removeChild(exportDiv);
    } catch (e) {
        alert('PDF export failed: ' + e.message);
    }
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function setupEventListeners() {
    const canvas = document.getElementById('mindmap-canvas');
    if (!canvas) return;
    
    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mouseup', handleCanvasMouseUp);
    canvas.addEventListener('mouseleave', handleCanvasMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    document.getElementById('mm-edit-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveNodeEdit();
        if (e.key === 'Escape') cancelNodeEdit();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cancelNodeEdit();
            hideStyleEditor();
            hideBranchMenu();
        }
    });
    
    document.getElementById('style-editor').addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    document.getElementById('branch-menu').addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    document.getElementById('shape-select').addEventListener('change', autoApplyStyle);
    document.getElementById('bg-color').addEventListener('input', autoApplyStyle);
    document.getElementById('text-color').addEventListener('input', autoApplyStyle);
    document.getElementById('font-size').addEventListener('input', autoApplyStyle);
    document.getElementById('font-family').addEventListener('change', autoApplyStyle);
    document.getElementById('node-width').addEventListener('input', autoApplyStyle);
    document.getElementById('node-height').addEventListener('input', autoApplyStyle);
    document.getElementById('node-min-width').addEventListener('input', autoApplyStyle);
    document.getElementById('node-min-height').addEventListener('input', autoApplyStyle);
}

document.addEventListener('DOMContentLoaded', init);