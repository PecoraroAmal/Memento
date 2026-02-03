// Registrazione Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrato:', reg))
            .catch(err => console.log('Service Worker non registrato:', err));
    });
}

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

// Variabili globali
let events = [];
let tags = [];
let editingEventId = null;
let filters = {
    search: '',
    tag: '',
    year: '',
    month: '',
    hour: ''
};

// Elementi DOM
const eventsList = document.getElementById('eventsList');
const eventModal = document.getElementById('eventModal');
const eventForm = document.getElementById('eventForm');
const newEventBtn = document.getElementById('newEventBtn');
const closeModal = document.querySelector('.close');
const cancelBtn = document.getElementById('cancelBtn');
const modalTitle = document.getElementById('modalTitle');
const searchBox = document.getElementById('searchBox');
const toggleFiltersBtn = document.getElementById('toggleFilters');
const filtersContainer = document.getElementById('filtersContainer');
const filterTag = document.getElementById('filterTag');
const filterYear = document.getElementById('filterYear');
const filterMonth = document.getElementById('filterMonth');
const filterHour = document.getElementById('filterHour');

// Applica tema salvato
const savedTheme = localStorage.getItem('mementoTheme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
}

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
        localStorage.setItem('mementoTags', JSON.stringify(tags));
    }
    
    updateTagSelect();
}

// Aggiorna select dei tag
function updateTagSelect() {
    const select = document.getElementById('eventTag');
    select.innerHTML = '<option value="">Seleziona un tag</option>' + 
        tags.map(tag => `<option value="${tag.id}">${escapeHtml(tag.name)}</option>`).join('');
    
    // Aggiorna anche filtro tag
    filterTag.innerHTML = '<option value="">Tutti</option>' + 
        tags.map(tag => `<option value="${tag.id}">${escapeHtml(tag.name)}</option>`).join('');
}

// Popola filtro anno
function updateYearFilter() {
    const years = [...new Set(events.map(e => new Date(e.date).getFullYear()))].sort((a, b) => b - a);
    filterYear.innerHTML = '<option value="">Tutti</option>' + 
        years.map(year => `<option value="${year}">${year}</option>`).join('');
}

// Popola filtro ora
function updateHourFilter() {
    filterHour.innerHTML = '<option value="">Tutte</option>';
    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        filterHour.innerHTML += `<option value="${hour}">${hour}:00</option>`;
    }
}

// Filtra eventi
function filterEvents() {
    let filtered = [...events];
    
    // Ricerca testo
    if (filters.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(e => 
            e.title.toLowerCase().includes(search) ||
            (e.description && e.description.toLowerCase().includes(search)) ||
            (e.list && e.list.some(item => item.text.toLowerCase().includes(search))) ||
            (e.replies && e.replies.some(reply => reply.text.toLowerCase().includes(search)))
        );
    }
    
    // Filtro tag
    if (filters.tag) {
        filtered = filtered.filter(e => e.tag_id === filters.tag);
    }
    
    // Filtro anno
    if (filters.year) {
        filtered = filtered.filter(e => new Date(e.date).getFullYear().toString() === filters.year);
    }
    
    // Filtro mese
    if (filters.month) {
        filtered = filtered.filter(e => {
            const month = (new Date(e.date).getMonth() + 1).toString().padStart(2, '0');
            return month === filters.month;
        });
    }
    
    // Filtro ora
    if (filters.hour) {
        filtered = filtered.filter(e => {
            const hour = new Date(e.date).getHours().toString().padStart(2, '0');
            return hour === filters.hour;
        });
    }
    
    return filtered;
}

// Aggiorna anteprima tag
function updateTagPreview() {
    const select = document.getElementById('eventTag');
    const tagPreview = document.getElementById('tagPreview');
    const tagPreviewBadge = document.getElementById('tagPreviewBadge');
    
    const selectedTagId = select.value;
    
    if (selectedTagId) {
        const tag = getTagById(selectedTagId);
        if (tag) {
            tagPreviewBadge.textContent = tag.name;
            tagPreviewBadge.style.backgroundColor = tag.color;
            tagPreview.style.display = 'block';
        }
    } else {
        tagPreview.style.display = 'none';
    }
}

// Carica eventi da localStorage
function loadEvents() {
    const stored = localStorage.getItem('mementoEvents');
    events = stored ? JSON.parse(stored) : [];
    updateYearFilter();
    updateHourFilter();
    renderEvents();
}

// Salva eventi in localStorage
function saveEvents() {
    localStorage.setItem('mementoEvents', JSON.stringify(events));
}

// Trova tag per id
function getTagById(id) {
    return tags.find(t => t.id === id);
}

// Renderizza gli eventi
function renderEvents() {
    const filtered = filterEvents();
    
    if (filtered.length === 0) {
        eventsList.innerHTML = '<p class="empty-state">Nessun evento trovato</p>';
        return;
    }

    eventsList.innerHTML = filtered
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(event => {
            const tag = getTagById(event.tag_id);
            const tagName = tag ? tag.name : 'Senza tag';
            const tagColor = tag ? tag.color : '#999999';
            const replies = event.replies || [];
            
            return `
            <div class="event-card" data-id="${event.id}">
                <div class="event-header">
                    <div>
                        <h3 class="event-title">${escapeHtml(event.title)}</h3>
                        <span class="event-tag" style="background-color: ${tagColor}">${escapeHtml(tagName)}</span>
                    </div>
                </div>
                <p class="event-date">${formatDate(event.date)}</p>
                ${event.description ? `<p class="event-text">${escapeHtml(event.description)}</p>` : ''}
                ${event.list && event.list.length > 0 ? `
                    <ul class="event-checklist">
                        ${event.list.map((item, idx) => `
                            <li>
                                <label>
                                    <input type="checkbox" ${item.checked ? 'checked' : ''} 
                                           onchange="toggleCheckbox('${event.id}', ${idx})">
                                    <span class="${item.checked ? 'checked-item' : ''}">${escapeHtml(item.text)}</span>
                                </label>
                            </li>
                        `).join('')}
                    </ul>
                ` : ''}
                
                ${replies.length > 0 ? `
                    <div class="event-replies">
                        <strong style="color: var(--text-color); opacity: 0.7;">Risposte (${replies.length})</strong>
                        ${replies.map(reply => `
                            <div class="reply-card" data-reply-id="${reply.id}">
                                <div class="reply-meta">
                                    <span>${formatDate(reply.date)}</span>
                                    <div>
                                        <button class="action-btn" style="padding: 0.3rem 0.5rem; font-size: 0.85rem; margin-left: 0.5rem;" onclick="editReply('${event.id}', '${reply.id}')" title="Modifica risposta"><i class="fas fa-edit"></i></button>
                                        <button class="danger-btn" style="padding: 0.3rem 0.5rem; font-size: 0.85rem;" onclick="deleteReply('${event.id}', '${reply.id}')" title="Elimina risposta"><i class="fas fa-trash"></i></button>
                                    </div>
                                </div>
                                <div class="reply-text" id="replyText-${reply.id}">${escapeHtml(reply.text)}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div class="event-actions">
                    <button class="action-btn" onclick="showReplyForm('${event.id}')"><i class="fas fa-reply"></i></button>
                    <button class="action-btn" onclick="editEvent('${event.id}')"><i class="fas fa-edit"></i></button>
                    <button class="danger-btn" onclick="deleteEvent('${event.id}')"><i class="fas fa-trash"></i></button>
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

// Apri modal per nuovo evento
newEventBtn.addEventListener('click', () => {
    editingEventId = null;
    modalTitle.textContent = 'Nuovo Evento';
    eventForm.reset();
    
    // Imposta data e ora corrente
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('eventDate').value = now.toISOString().slice(0, 16);
    
    // Nascondi anteprima tag
    document.getElementById('tagPreview').style.display = 'none';
    
    eventModal.classList.add('show');
});

// Listener per cambio tag
document.getElementById('eventTag').addEventListener('change', updateTagPreview);

// Listener per ricerca e filtri
searchBox.addEventListener('input', (e) => {
    filters.search = e.target.value;
    renderEvents();
});

filterTag.addEventListener('change', (e) => {
    filters.tag = e.target.value;
    renderEvents();
});

filterYear.addEventListener('change', (e) => {
    filters.year = e.target.value;
    renderEvents();
});

filterMonth.addEventListener('change', (e) => {
    filters.month = e.target.value;
    renderEvents();
});

filterHour.addEventListener('change', (e) => {
    filters.hour = e.target.value;
    renderEvents();
});

// Mostra form risposta
function showReplyForm(eventId) {
    const card = document.querySelector(`.event-card[data-id="${eventId}"]`);
    const existing = card.querySelector('.reply-form');
    
    if (existing) {
        existing.remove();
        return;
    }
    
    const replyForm = document.createElement('div');
    replyForm.className = 'reply-form';
    replyForm.innerHTML = `
        <textarea class="reply-input" placeholder="Scrivi una risposta..." id="replyInput-${eventId}"></textarea>
        <div class="reply-actions">
            <button class="secondary-btn" onclick="cancelReply('${eventId}')">Annulla</button>
            <button class="primary-btn" onclick="submitReply('${eventId}')">Rispondi</button>
        </div>
    `;
    
    card.querySelector('.event-actions').before(replyForm);
    document.getElementById(`replyInput-${eventId}`).focus();
}

// Annulla risposta
function cancelReply(eventId) {
    const card = document.querySelector(`.event-card[data-id="${eventId}"]`);
    const replyForm = card.querySelector('.reply-form');
    if (replyForm) replyForm.remove();
}

// Invia risposta
function submitReply(eventId) {
    const input = document.getElementById(`replyInput-${eventId}`);
    const text = input.value.trim();
    
    if (!text) return;
    
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    if (!event.replies) event.replies = [];
    
    event.replies.push({
        id: Date.now().toString(),
        text: text,
        date: new Date().toISOString()
    });
    
    saveEvents();
    renderEvents();
}

// Elimina risposta
async function deleteReply(eventId, replyId) {
    const confirmed = await showConfirm('Sei sicuro di voler eliminare questa risposta?');
    if (!confirmed) return;
    
    const event = events.find(e => e.id === eventId);
    if (!event || !event.replies) return;
    
    event.replies = event.replies.filter(r => r.id !== replyId);
    
    saveEvents();
    renderEvents();
}

// Modifica risposta
function editReply(eventId, replyId) {
    const event = events.find(e => e.id === eventId);
    if (!event || !event.replies) return;
    
    const reply = event.replies.find(r => r.id === replyId);
    if (!reply) return;
    
    const card = document.querySelector(`.reply-card[data-reply-id="${replyId}"]`);
    const textDiv = card.querySelector(`#replyText-${replyId}`);
    const metaDiv = card.querySelector('.reply-meta');
    
    // Crea form di modifica
    const editForm = document.createElement('div');
    editForm.className = 'reply-edit-form';
    editForm.innerHTML = `
        <textarea class="reply-input" id="editReplyInput-${replyId}">${escapeHtml(reply.text)}</textarea>
        <div class="reply-actions">
            <button class="secondary-btn" onclick="cancelEditReply('${replyId}', '${escapeHtml(reply.text).replace(/'/g, "\\'")}')">Annulla</button>
            <button class="primary-btn" onclick="saveEditReply('${eventId}', '${replyId}')">Salva</button>
        </div>
    `;
    
    // Nascondi testo originale
    textDiv.style.display = 'none';
    metaDiv.style.display = 'none';
    
    // Inserisci form
    card.appendChild(editForm);
    document.getElementById(`editReplyInput-${replyId}`).focus();
}

// Annulla modifica risposta
function cancelEditReply(replyId, originalText) {
    const card = document.querySelector(`.reply-card[data-reply-id="${replyId}"]`);
    const editForm = card.querySelector('.reply-edit-form');
    const textDiv = card.querySelector(`#replyText-${replyId}`);
    const metaDiv = card.querySelector('.reply-meta');
    
    if (editForm) editForm.remove();
    textDiv.style.display = '';
    metaDiv.style.display = '';
}

// Salva modifica risposta
function saveEditReply(eventId, replyId) {
    const input = document.getElementById(`editReplyInput-${replyId}`);
    const text = input.value.trim();
    
    if (!text) return;
    
    const event = events.find(e => e.id === eventId);
    if (!event || !event.replies) return;
    
    const reply = event.replies.find(r => r.id === replyId);
    if (!reply) return;
    
    reply.text = text;
    reply.date = new Date().toISOString(); // Aggiorna data di modifica
    
    saveEvents();
    renderEvents();
}

// Chiudi modal
closeModal.addEventListener('click', () => {
    eventModal.classList.remove('show');
});

cancelBtn.addEventListener('click', () => {
    eventModal.classList.remove('show');
});

window.addEventListener('click', (e) => {
    if (e.target === eventModal) {
        eventModal.classList.remove('show');
    }
});

// Toggle checkbox
function toggleCheckbox(eventId, itemIndex) {
    const event = events.find(e => e.id === eventId);
    if (event && event.list[itemIndex]) {
        event.list[itemIndex].checked = !event.list[itemIndex].checked;
        saveEvents();
        renderEvents();
    }
}

// Salva evento
eventForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const listText = document.getElementById('eventList').value;
    const listItems = listText
        .split('\n')
        .filter(item => item.trim() !== '')
        .map(text => ({ text: text.trim(), checked: false }));

    const eventData = {
        id: editingEventId || Date.now().toString(),
        title: document.getElementById('eventName').value,
        tag_id: document.getElementById('eventTag').value,
        description: document.getElementById('eventText').value,
        list: listItems,
        date: document.getElementById('eventDate').value,
        createdAt: editingEventId ? events.find(e => e.id === editingEventId).createdAt : new Date().toISOString()
    };

    if (editingEventId) {
        const index = events.findIndex(e => e.id === editingEventId);
        // Mantieni lo stato delle checkbox esistenti
        const oldEvent = events[index];
        if (oldEvent.list && eventData.list) {
            eventData.list = eventData.list.map((item, idx) => {
                if (oldEvent.list[idx] && oldEvent.list[idx].text === item.text) {
                    return { ...item, checked: oldEvent.list[idx].checked };
                }
                return item;
            });
        }
        events[index] = eventData;
    } else {
        events.push(eventData);
    }

    saveEvents();
    renderEvents();
    eventModal.classList.remove('show');
});

// Modifica evento
function editEvent(id) {
    const event = events.find(e => e.id === id);
    if (!event) return;

    editingEventId = id;
    modalTitle.textContent = 'Modifica Evento';

    document.getElementById('eventName').value = event.title;
    document.getElementById('eventText').value = event.description;
    document.getElementById('eventList').value = event.list.map(item => item.text).join('\n');
    document.getElementById('eventDate').value = event.date;
    document.getElementById('eventTag').value = event.tag_id;
    
    // Aggiorna anteprima tag
    updateTagPreview();

    eventModal.classList.add('show');
}

// Elimina evento (sposta in cronologia)
async function deleteEvent(id) {
    const confirmed = await showConfirm('Sei sicuro di voler eliminare questo evento? Verrà spostato nella cronologia.');
    if (!confirmed) return;

    const event = events.find(e => e.id === id);
    if (!event) return;

    // Aggiungi alla cronologia
    let history = JSON.parse(localStorage.getItem('mementoHistory') || '[]');
    history.push({
        ...event,
        deletedAt: new Date().toISOString()
    });
    localStorage.setItem('mementoHistory', JSON.stringify(history));

    // Rimuovi dagli eventi attivi
    events = events.filter(e => e.id !== id);
    saveEvents();
    renderEvents();
}

// Toggle filtri
toggleFiltersBtn.addEventListener('click', () => {
    if (filtersContainer.style.display === 'none') {
        filtersContainer.style.display = 'block';
        toggleFiltersBtn.classList.add('active');
    } else {
        filtersContainer.style.display = 'none';
        toggleFiltersBtn.classList.remove('active');
    }
});

// Carica eventi all'avvio
loadTags();
loadEvents();