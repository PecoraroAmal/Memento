// Variabili globali
let tags = [];
let editingTagId = null;

// Sistema di conferma/avviso personalizzato
function showConfirm(message, title = 'Conferma') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOk');
        const cancelBtn = document.getElementById('confirmCancel');

        titleEl.textContent = title;
        messageEl.textContent = message;
        modal.classList.add('show');

        const handleOk = () => {
            modal.classList.remove('show');
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };

        const handleCancel = () => {
            modal.classList.remove('show');
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };

        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
    });
}

function showAlert(message, title = 'Avviso') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOk');
        const cancelBtn = document.getElementById('confirmCancel');

        titleEl.textContent = title;
        messageEl.textContent = message;
        cancelBtn.style.display = 'none';
        modal.classList.add('show');

        const handleOk = () => {
            modal.classList.remove('show');
            cancelBtn.style.display = '';
            okBtn.removeEventListener('click', handleOk);
            resolve(true);
        };

        okBtn.addEventListener('click', handleOk);
    });
}

// Elementi DOM
const tagsList = document.getElementById('tagsList');
const tagModal = document.getElementById('tagModal');
const tagForm = document.getElementById('tagForm');
const newTagBtn = document.getElementById('newTagBtn');
const closeModal = document.querySelector('.close');
const cancelTagBtn = document.getElementById('cancelTagBtn');
const tagModalTitle = document.getElementById('tagModalTitle');
const tagColorInput = document.getElementById('tagColor');
const colorValueSpan = document.getElementById('colorValue');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const themeToggle = document.getElementById('themeToggle');

// Applica tema salvato
const savedTheme = localStorage.getItem('mementoTheme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    themeToggle.checked = true;
}

// Gestione tema
themeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('mementoTheme', 'dark');
    } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('mementoTheme', 'light');
    }
});

// Carica tag da localStorage
function loadTags() {
    const stored = localStorage.getItem('mementoTags');
    tags = stored ? JSON.parse(stored) : [];
    
    // Crea tag di default se non esistono
    if (tags.length === 0) {
        tags = [
            { id: '1', name: 'Lavoro', color: '#000000' },
            { id: '2', name: 'Personale', color: '#666666' },
            { id: '3', name: 'Urgente', color: '#333333' }
        ];
        saveTags();
    }
    
    renderTags();
}

// Salva tag in localStorage
function saveTags() {
    localStorage.setItem('mementoTags', JSON.stringify(tags));
}

// Renderizza tag
function renderTags() {
    if (tags.length === 0) {
        tagsList.innerHTML = '<p class="empty-state">Nessun tag. Crea il tuo primo tag!</p>';
        return;
    }

    tagsList.innerHTML = tags.map(tag => `
        <div class="tag-item" data-id="${tag.id}">
            <div class="tag-info">
                <span class="tag-badge" style="background-color: ${tag.color}">${escapeHtml(tag.name)}</span>
            </div>
            <div class="tag-actions">
                <button class="action-btn" onclick="editTag('${tag.id}')"><i class="fas fa-edit"></i></button>
                <button class="danger-btn" onclick="deleteTag('${tag.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

// Escape HTML per sicurezza
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Apri modal per nuovo tag
newTagBtn.addEventListener('click', () => {
    editingTagId = null;
    tagModalTitle.textContent = 'Nuovo Tag';
    tagForm.reset();
    tagColorInput.value = '#000000';
    colorValueSpan.textContent = '#000000';
    tagModal.classList.add('show');
});

// Chiudi modal
closeModal.addEventListener('click', () => {
    tagModal.classList.remove('show');
});

cancelTagBtn.addEventListener('click', () => {
    tagModal.classList.remove('show');
});

window.addEventListener('click', (e) => {
    if (e.target === tagModal) {
        tagModal.classList.remove('show');
    }
});

// Update color value display
tagColorInput.addEventListener('input', (e) => {
    colorValueSpan.textContent = e.target.value.toUpperCase();
});

// Salva tag
tagForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const tagData = {
        id: editingTagId || Date.now().toString(),
        name: document.getElementById('tagName').value,
        color: document.getElementById('tagColor').value
    };

    if (editingTagId) {
        const index = tags.findIndex(t => t.id === editingTagId);
        tags[index] = tagData;
    } else {
        tags.push(tagData);
    }

    saveTags();
    renderTags();
    tagModal.classList.remove('show');
});

// Modifica tag
function editTag(id) {
    const tag = tags.find(t => t.id === id);
    if (!tag) return;

    editingTagId = id;
    tagModalTitle.textContent = 'Modifica Tag';

    document.getElementById('tagName').value = tag.name;
    document.getElementById('tagColor').value = tag.color;
    colorValueSpan.textContent = tag.color.toUpperCase();

    tagModal.classList.add('show');
}

// Elimina tag
async function deleteTag(id) {
    // Verifica se il tag è utilizzato da eventi
    const events = JSON.parse(localStorage.getItem('mementoEvents') || '[]');
    const isUsed = events.some(e => e.tag_id === id);

    if (isUsed) {
        await showAlert('Impossibile eliminare questo tag perché è utilizzato da uno o più eventi.', 'Errore');
        return;
    }

    const confirmed = await showConfirm('Sei sicuro di voler eliminare questo tag?');
    if (!confirmed) return;

    tags = tags.filter(t => t.id !== id);
    saveTags();
    renderTags();
}

// Esporta database
exportBtn.addEventListener('click', async () => {
    const db = {
        tags: JSON.parse(localStorage.getItem('mementoTags') || '[]'),
        events: JSON.parse(localStorage.getItem('mementoEvents') || '[]'),
        history: JSON.parse(localStorage.getItem('mementoHistory') || '[]'),
        exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(db, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `memento-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    await showAlert('Database esportato con successo!', 'Successo');
});

// Importa database
importBtn.addEventListener('click', () => {
    importFile.click();
});

importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const db = JSON.parse(event.target.result);
            
            if (!db.tags || !db.events || !db.history) {
                await showAlert('File non valido. Il database deve contenere tags, events e history.', 'Errore');
                return;
            }

            const confirmed = await showConfirm('Importare il database? Tutti i dati attuali verranno sostituiti.');
            if (confirmed) {
                localStorage.setItem('mementoTags', JSON.stringify(db.tags));
                localStorage.setItem('mementoEvents', JSON.stringify(db.events));
                localStorage.setItem('mementoHistory', JSON.stringify(db.history));
                
                loadTags();
                await showAlert('Database importato con successo!', 'Successo');
            }
        } catch (error) {
            await showAlert('Errore durante l\'importazione del database: ' + error.message, 'Errore');
        }
    };
    
    reader.readAsText(file);
    importFile.value = '';
});

// Elimina tutti i dati
const deleteAllBtn = document.getElementById('deleteAllBtn');
deleteAllBtn.addEventListener('click', async () => {
    const confirmed = await showConfirm('Sei ASSOLUTAMENTE SICURO di voler eliminare TUTTI i dati? Questa azione è IRREVERSIBILE e cancellerà eventi, tag, cronologia e impostazioni.', 'ATTENZIONE');
    
    if (!confirmed) return;
    
    // Doppia conferma per sicurezza
    const doubleConfirm = await showConfirm('ULTIMA CONFERMA: Tutti i tuoi dati verranno eliminati permanentemente. Non potrai recuperarli. Continuare?', 'CONFERMA FINALE');
    
    if (doubleConfirm) {
        // Elimina tutti i dati da localStorage
        localStorage.removeItem('mementoEvents');
        localStorage.removeItem('mementoTags');
        localStorage.removeItem('mementoHistory');
        localStorage.removeItem('mementoTheme');
        
        await showAlert('Tutti i dati sono stati eliminati. La pagina verrà ricaricata.', 'Completato');
        
        // Ricarica la pagina per resettare tutto
        window.location.reload();
    }
});

// Carica tag all'avvio
loadTags();
