// API configuration
const API_URL = 'https://xqpltool.guoharry267.workers.dev';
const token = localStorage.getItem('token');

// ===== HTML ESCAPE TO PREVENT XSS =====
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Global state
let notebooks = [];
let currentNotebookId = null;
let notes = [];
let currentNoteId = null;

// Initialize Quill Editor
const quill = new Quill('#quill-editor', {
    theme: 'snow',
    modules: {
        toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['blockquote', 'code-block'],
            [{ color: [] }, { background: [] }],
            ['clean']
        ]
    }
});

// DOM Elements
const notebookSelect = document.getElementById('notebook-select');
const newNotebookBtn = document.getElementById('new-notebook-btn');
const delNotebookBtn = document.getElementById('del-notebook-btn');
const notesListContainer = document.getElementById('notes-list-container');
const newNoteBtn = document.getElementById('new-note-btn');
const noteTitleInput = document.getElementById('note-title');
const noteSectionInput = document.getElementById('note-section');
const saveNoteBtn = document.getElementById('save-note-btn');
const delNoteBtn = document.getElementById('del-note-btn');
const exportPdfBtn = document.getElementById('export-pdf-btn');
const exportWordBtn = document.getElementById('export-word-btn');
const saveIndicator = document.getElementById('save-indicator');

// Event Listeners
notebookSelect.addEventListener('change', (e) => loadNotes(e.target.value));
newNotebookBtn.addEventListener('click', createNotebook);
delNotebookBtn.addEventListener('click', deleteNotebook);
newNoteBtn.addEventListener('click', createNewNote);
saveNoteBtn.addEventListener('click', saveNote);
delNoteBtn.addEventListener('click', deleteNote);
exportPdfBtn.addEventListener('click', exportToPdf);
exportWordBtn.addEventListener('click', exportToWord);

// Auto-save typing timeout
let typingTimer;
quill.on('text-change', () => {
    clearTimeout(typingTimer);
    if(currentNoteId) {
        typingTimer = setTimeout(saveNote, 2000);
    }
});

noteTitleInput.addEventListener('input', () => {
    clearTimeout(typingTimer);
    if(currentNoteId) typingTimer = setTimeout(saveNote, 2000);
});

noteSectionInput.addEventListener('input', () => {
    clearTimeout(typingTimer);
    if(currentNoteId) typingTimer = setTimeout(saveNote, 2000);
});

// Init
document.addEventListener('DOMContentLoaded', loadNotebooks);

// ====== NOTEBOOK FUNCTIONS ======
async function loadNotebooks() {
    try {
        const res = await fetch(`${API_URL}/notebooks`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to load notebooks");
        notebooks = await res.json();
        
        notebookSelect.innerHTML = '';
        if (notebooks.length === 0) {
            notebookSelect.innerHTML = '<option value="">No notebooks</option>';
            currentNotebookId = null;
            notesListContainer.innerHTML = '';
            clearEditor();
            return;
        }

        notebooks.forEach(nb => {
            const opt = document.createElement('option');
            opt.value = nb.id;
            opt.textContent = nb.name;
            notebookSelect.appendChild(opt);
        });

        // Load the first notebook's notes
        currentNotebookId = notebooks[0].id;
        loadNotes(currentNotebookId);

    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}

async function createNotebook() {
    const name = prompt('Enter notebook name:');
    if (!name) return;
    
    try {
        const res = await fetch(`${API_URL}/notebooks`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ name })
        });
        if (res.ok) {
            loadNotebooks();
        } else {
            const data = await res.json();
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
    }
}

async function deleteNotebook() {
    if (!currentNotebookId) return;
    if (!confirm('Are you sure you want to delete this notebook and ALL its notes?')) return;
    
    try {
        const res = await fetch(`${API_URL}/notebooks/${currentNotebookId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            loadNotebooks();
        } else {
            alert('Failed to delete notebook');
        }
    } catch (err) {
        console.error(err);
    }
}

// ====== NOTES FUNCTIONS ======
async function loadNotes(notebookId) {
    if (!notebookId) return;
    currentNotebookId = notebookId;
    
    try {
        const res = await fetch(`${API_URL}/notes?notebook_id=${notebookId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to load notes");
        notes = await res.json();
        
        renderNotesList();

        if (notes.length > 0) {
            selectNote(notes[0].id);
        } else {
            clearEditor();
        }
    } catch (err) {
        console.error(err);
    }
}

function renderNotesList() {
    notesListContainer.innerHTML = '';
    
    // Group notes by section
    const grouped = {};
    notes.forEach(note => {
        const sec = note.section || 'General';
        if (!grouped[sec]) grouped[sec] = [];
        grouped[sec].push(note);
    });

    Object.keys(grouped).sort().forEach(sec => {
        // Section Header
        const secHeader = document.createElement('div');
        secHeader.className = 'section-header';
        secHeader.innerHTML = `<h4 style="margin: 10px 0 5px 0; color: var(--accent-color); font-size: 0.9em; text-transform: uppercase;">${sec}</h4>`;
        notesListContainer.appendChild(secHeader);

        // Notes in section
        grouped[sec].forEach(note => {
            const el = document.createElement('div');
            el.className = `note-item ${note.id === currentNoteId ? 'active' : ''}`;
            el.innerHTML = `
                <div class="note-title-display">${escapeHtml(note.title || 'Untitled')}</div>
                <div class="note-section-display">Updated: ${new Date(note.updated_at).toLocaleDateString()}</div>
            `;
            el.addEventListener('click', () => selectNote(note.id));
            notesListContainer.appendChild(el);
        });
    });
}

function selectNote(id) {
    currentNoteId = id;
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;

    noteTitleInput.value = note.title || '';
    noteSectionInput.value = note.section || '';
    quill.root.innerHTML = note.content || '';

    // Update active class in list
    document.querySelectorAll('.note-item').forEach(el => el.classList.remove('active'));
    renderNotesList(); // Simple way to refresh active state
}

function clearEditor() {
    currentNoteId = null;
    noteTitleInput.value = '';
    noteSectionInput.value = '';
    quill.root.innerHTML = '';
}

async function createNewNote() {
    if (!currentNotebookId) {
        alert("Please create a notebook first.");
        return;
    }
    
    const defaultSection = notes.length > 0 ? (notes[0].section || 'General') : 'General';
    
    clearEditor();
    
    try {
        const res = await fetch(`${API_URL}/notes`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ 
                notebook_id: currentNotebookId,
                title: 'New Note',
                section: defaultSection,
                content: ''
            })
        });
        if (res.ok) {
            const data = await res.json();
            await loadNotes(currentNotebookId);
            selectNote(data.id);
            noteTitleInput.focus();
            noteTitleInput.select();
        }
    } catch (err) {
        console.error(err);
    }
}

async function saveNote() {
    if (!currentNoteId) return;

    const title = noteTitleInput.value;
    const section = noteSectionInput.value || 'General';
    const content = quill.root.innerHTML;

    try {
        const res = await fetch(`${API_URL}/notes/${currentNoteId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ title, section, content })
        });
        
        if (res.ok) {
            // Update local memory and list silently
            const noteIndex = notes.findIndex(n => n.id === currentNoteId);
            if(noteIndex > -1) {
                notes[noteIndex].title = title;
                notes[noteIndex].section = section;
                notes[noteIndex].content = content;
                notes[noteIndex].updated_at = new Date().toISOString();
                renderNotesList();
            }

            // Show indicator
            saveIndicator.classList.add('active');
            setTimeout(() => { saveIndicator.classList.remove('active'); }, 2000);
        }
    } catch (err) {
        console.error('Failed to save note:', err);
    }
}

async function deleteNote() {
    if (!currentNoteId) return;
    if (!confirm('Delete this note?')) return;

    try {
        const res = await fetch(`${API_URL}/notes/${currentNoteId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            loadNotes(currentNotebookId);
        }
    } catch (err) {
        console.error(err);
    }
}

// ====== EXPORT FUNCTIONS ======
function exportToPdf() {
    if (!currentNoteId) { alert("Select a note to export"); return; }
    
    const content = quill.root.innerHTML;
    const title = noteTitleInput.value || 'Untitled';
    
    const exportDiv = document.createElement('div');
    exportDiv.innerHTML = `<h2>${title}</h2>` + content;
    exportDiv.style.fontFamily = 'Arial, sans-serif';
    exportDiv.style.padding = '20px';
    exportDiv.style.color = '#000';
    
    const opt = {
      margin:       1,
      filename:     `${title}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(exportDiv).save();
}

function exportToWord() {
    if (!currentNoteId) { alert("Select a note to export"); return; }
    
    const content = quill.root.innerHTML;
    const title = noteTitleInput.value || 'Untitled';
    
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
                   "xmlns:w='urn:schemas-microsoft-com:office:word' " +
                   "xmlns='http://www.w3.org/TR/REC-html40'>" +
                   "<head><meta charset='utf-8'><title>Export HTML to Word Document</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + `<h2>${title}</h2>` + content + footer;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `${title}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
}
