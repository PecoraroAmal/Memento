// Variabili globali
let history = [];
let tags = [];

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
const historyList = document.getElementById('historyList');

// Applica tema salvato
const savedTheme = localStorage.getItem('mementoTheme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
}

// Carica tag da localStorage
function loadTags() {
    const stored = localStorage.getItem('mementoTags');
    tags = stored ? JSON.parse(stored) : [];
}

// Trova tag per id
function getTagById(id) {
    return tags.find(t => t.id === id);
}

// Carica cronologia da localStorage
function loadHistory() {
    const stored = localStorage.getItem('mementoHistory');
    history = stored ? JSON.parse(stored) : [];
    renderHistory();
}

// Salva cronologia in localStorage
function saveHistory() {
    localStorage.setItem('mementoHistory', JSON.stringify(history));
}

// Renderizza cronologia
function renderHistory() {
    if (history.length === 0) {
        historyList.innerHTML = '<p class="empty-state">Nessun evento eliminato</p>';
        return;
    }

    historyList.innerHTML = history
        .sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))
        .map(event => {
            const tag = getTagById(event.tag_id);
            const tagName = tag ? tag.name : 'Senza tag';
            const tagColor = tag ? tag.color : '#999999';
            
            return `
            <div class="event-card" data-id="${event.id}">
                <div class="event-header">
                    <div>
                        <h3 class="event-title">${escapeHtml(event.title)}</h3>
                        <span class="event-tag" style="background-color: ${tagColor}">${escapeHtml(tagName)}</span>
                    </div>
                </div>
                <p class="event-date">${formatDate(event.date)}</p>
                <p class="event-date" style="color: #999;">Eliminato: ${formatDate(event.deletedAt)}</p>
                ${event.description ? `<p class="event-text">${escapeHtml(event.description)}</p>` : ''}
                ${event.list && event.list.length > 0 ? `
                    <ul class="event-checklist">
                        ${event.list.map(item => `
                            <li>
                                <label>
                                    <input type="checkbox" ${item.checked ? 'checked' : ''} disabled>
                                    <span class="${item.checked ? 'checked-item' : ''}">${escapeHtml(item.text)}</span>
                                </label>
                            </li>
                        `).join('')}
                    </ul>
                ` : ''}
                <div class="event-actions">
                    <button class="action-btn" onclick="restoreEvent('${event.id}')"><i class="fas fa-undo"></i></button>
                    <button class="danger-btn" onclick="deleteEventPermanently('${event.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
        }).join('');
}

// Formatta la data
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Escape HTML per sicurezza
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Ripristina evento
async function restoreEvent(id) {
    const confirmed = await showConfirm('Vuoi ripristinare questo evento?');
    if (!confirmed) return;

    const event = history.find(e => e.id === id);
    if (!event) return;

    // Rimuovi dalla cronologia
    history = history.filter(e => e.id !== id);
    saveHistory();

    // Aggiungi agli eventi attivi
    let events = JSON.parse(localStorage.getItem('mementoEvents') || '[]');
    const { deletedAt, ...eventWithoutDeleted } = event;
    events.push(eventWithoutDeleted);
    localStorage.setItem('mementoEvents', JSON.stringify(events));

    renderHistory();
}

// Elimina evento definitivamente
async function deleteEventPermanently(id) {
    const confirmed = await showConfirm('Sei sicuro di voler eliminare definitivamente questo evento? Questa azione non può essere annullata.', 'Attenzione');
    if (!confirmed) return;

    history = history.filter(e => e.id !== id);
    saveHistory();
    renderHistory();
}

// Carica cronologia all'avvio
loadTags();
loadHistory();