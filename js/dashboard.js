document.addEventListener('DOMContentLoaded', () => {
    // Safe JSON parse
    function safeParse(item) {
        try {
            return JSON.parse(item);
        } catch (e) {
            return null;
        }
    }

    function getUsers() {
        return safeParse(localStorage.getItem('users')) || {};
    }

    // currentUser can be stored as string or object; normalize to username string
    function getCurrentUsername() {
        const raw = safeParse(localStorage.getItem('currentUser'));
        if (raw === null) {
            // not JSON, maybe plain string
            return localStorage.getItem('currentUser') || null;
        }
        if (typeof raw === 'string') return raw;
        if (typeof raw === 'object' && raw.username) return raw.username;
        return null;
    }

    function getViewingUser() {
        return localStorage.getItem('viewingUser') || null;
    }

    // Basic HTML escaping to avoid injection when using innerHTML
    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"'`=\/]/g, s =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' }[s])
        );
    }

    let actualUser = getViewingUser() || getCurrentUsername();
    let users = getUsers();

    // Function to load Google Calendar API
    function loadGoogleCalendarAPI() {
        gapi.load('client:auth2', initClient);
    }

    // ...existing code...
    const discoveryUrl = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
    const clientId = '704086933437-3afe6m09pvsvsrd37sfntv4e36546c7a.apps.googleusercontent.com'; // Reemplazar con tu Client ID real
    const scope = 'https://www.googleapis.com/auth/calendar.readonly';
// ...existing code...


// ...existing code...
// Ejemplo Node + express (requiere instalar node-fetch o axios)
const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

app.post('/oauth/exchange', async (req, res) => {
  const { code, redirect_uri } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing code' });

  const params = new URLSearchParams();
  params.append('code', code);
  params.append('client_id', process.env.GOOGLE_CLIENT_ID);
  params.append('client_secret', process.env.GOOGLE_CLIENT_SECRET); // en vars de entorno
  params.append('redirect_uri', redirect_uri);
  params.append('grant_type', 'authorization_code');

  try {
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: params
    });
    const data = await resp.json();
    return res.json(data); // contiene access_token, refresh_token, etc.
  } catch (err) {
    return res.status(500).json({ error: 'token exchange failed' });
  }
});

module.exports = app;
// ...existing code...


    // Initialize Google API client
    function initClient() {
        const discoveryUrl = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
        const clientId = 'YOUR_GOOGLE_CLIENT_ID'; // Replace with your Google Client ID
        const scope = 'https://www.googleapis.com/auth/calendar.readonly';

        gapi.client.init({
            discoveryDocs: [discoveryUrl],
            clientId: clientId,
            scope: scope
        }).then(function () {
            // Listen for sign-in state changes.
            gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

            // Handle the initial sign-in state.
            updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        });
    }

    // Handle sign-in state changes
    function updateSigninStatus(isSignedIn) {
        if (isSignedIn) {
            console.log('User signed in');
            listUpcomingEvents();
        } else {
            console.log('User not signed in');
            // Sign in the user
            gapi.auth2.getAuthInstance().signIn();
        }
    }

    // List upcoming events from Google Calendar
    function listUpcomingEvents() {
        gapi.client.calendar.events.list({
            'calendarId': 'primary',
            'timeMin': (new Date()).toISOString(),
            'maxResults': 10,
            'singleEvents': true,
            'orderBy': 'startTime'
        }).then(function (response) {
            const events = response.result.items;
            if (events && events.length > 0) {
                console.log('Upcoming events:');
                events.forEach(function (event) {
                    let start = event.start.dateTime || event.start.date;
                    console.log(event.summary + ' (' + start + ')');
                });
            } else {
                console.log('No upcoming events found.');
            }
        });
    }

    function initDashboard() {
        if (!actualUser || !users[actualUser]) {
            console.error('No hay usuario actual o el usuario no existe.');
            window.location.href = 'index.html'; // Redirigir si no hay usuario
            return;
        }

        displayUserInfo();
        loadUserEvents();
        setupEventListeners();

        // Load Google Calendar API after initializing the dashboard
        loadGoogleCalendarAPI();

        // Initialize dashboard config if available
        if (window.dashboardConfig) {
            window.dashboardConfig.init();
        }
    }

    function displayUserInfo() {
        const user = users[actualUser];
        const userNameElement = document.getElementById('user-name');
        const userEmailElement = document.getElementById('user-email');
        const userRoleElement = document.getElementById('user-role');
        const userColorElement = document.getElementById('user-color');
        const userPictureElement = document.getElementById('user-picture');

        if (userNameElement) userNameElement.textContent = escapeHtml(user.name || actualUser);
        if (userEmailElement) userEmailElement.textContent = escapeHtml(user.email || 'N/A');
        if (userRoleElement) userRoleElement.textContent = escapeHtml(user.role ? user.role.toUpperCase() : 'N/A');
        if (userColorElement) userColorElement.style.backgroundColor = escapeHtml(user.color || '#ccc');
        if (userPictureElement && user.picture) {
            userPictureElement.src = escapeHtml(user.picture);
            userPictureElement.style.display = 'block';
        } else if (userPictureElement) {
            userPictureElement.style.display = 'none';
        }

        // Display admin-specific elements if the current user is an admin
        const currentUser = getCurrentUsername();
        if (users[currentUser] && users[currentUser].role === 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
        } else {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        }

        // Hide certain elements if viewing another user's dashboard
        if (getViewingUser() && getViewingUser() !== getCurrentUsername()) {
            document.getElementById('add-event-btn').style.display = 'none';
            document.getElementById('logout-btn').style.display = 'none';
            document.getElementById('back-to-admin-btn').style.display = 'block';
        } else {
            document.getElementById('add-event-btn').style.display = 'block';
            document.getElementById('logout-btn').style.display = 'block';
            document.getElementById('back-to-admin-btn').style.display = 'none';
        }
    }

    function loadUserEvents() {
        const user = users[actualUser];
        const eventList = document.getElementById('event-list');
        if (!eventList) return;

        eventList.innerHTML = ''; // Clear existing events

        if (user.events && user.events.length > 0) {
            user.events.forEach(event => {
                const eventCard = createEventCard(event);
                eventList.appendChild(eventCard);
            });
        } else {
            eventList.innerHTML = '<p>No hay eventos programados.</p>';
        }
    }

    function createEventCard(event) {
        const card = document.createElement('div');
        card.classList.add('event-card');
        card.innerHTML = `
            <h3>${escapeHtml(event.title)}</h3>
            <p><strong>Fecha:</strong> ${escapeHtml(event.date)}</p>
            <p><strong>Hora:</strong> ${escapeHtml(event.time)}</p>
            <p><strong>Descripción:</strong> ${escapeHtml(event.description || 'Sin descripción')}</p>
            <button class="delete-event-btn" data-event-id="${escapeHtml(event.id)}">Eliminar</button>
        `;
        return card;
    }

    function setupEventListeners() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        const addEventBtn = document.getElementById('add-event-btn');
        if (addEventBtn) {
            addEventBtn.addEventListener('click', showAddEventModal);
        }

        const saveEventBtn = document.getElementById('save-event-btn');
        if (saveEventBtn) {
            saveEventBtn.addEventListener('click', handleSaveEvent);
        }

        const eventList = document.getElementById('event-list');
        if (eventList) {
            eventList.addEventListener('click', (event) => {
                if (event.target.classList.contains('delete-event-btn')) {
                    const eventId = event.target.dataset.eventId;
                    handleDeleteEvent(eventId);
                }
            });
        }

        const backToAdminBtn = document.getElementById('back-to-admin-btn');
        if (backToAdminBtn) {
            backToAdminBtn.addEventListener('click', () => {
                localStorage.removeItem('viewingUser');
                window.location.href = 'admin.html';
            });
        }
    }

    function handleLogout() {
        console.log('Logging out...');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('viewingUser');
        window.location.href = 'index.html';
    }

    function showAddEventModal() {
        const modal = document.getElementById('add-event-modal');
        if (modal) {
            modal.style.display = 'block';
            document.getElementById('event-title').value = '';
            document.getElementById('event-date').value = '';
            document.getElementById('event-time').value = '';
            document.getElementById('event-description').value = '';
        }
    }

    function hideAddEventModal() {
        const modal = document.getElementById('add-event-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    function handleSaveEvent() {
        const title = document.getElementById('event-title').value;
        const date = document.getElementById('event-date').value;
        const time = document.getElementById('event-time').value;
        const description = document.getElementById('event-description').value;

        if (!title || !date || !time) {
            alert('Por favor, completa todos los campos obligatorios (Título, Fecha, Hora).');
            return;
        }

        const newEvent = {
            id: Date.now().toString(), // Simple unique ID
            title: title,
            date: date,
            time: time,
            description: description
        };

        users[actualUser].events = users[actualUser].events || [];
        users[actualUser].events.push(newEvent);
        localStorage.setItem('users', JSON.stringify(users));
        loadUserEvents();
        hideAddEventModal();
    }

    function handleDeleteEvent(eventId) {
        if (confirm('¿Estás seguro de que quieres eliminar este evento?')) {
            users[actualUser].events = users[actualUser].events.filter(event => event.id !== eventId);
            localStorage.setItem('users', JSON.stringify(users));
            loadUserEvents();
        }
    }

    // Close modal when clicking on <span> (x)
    document.querySelector('.close-button').addEventListener('click', hideAddEventModal);

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('add-event-modal');
        if (event.target === modal) {
            hideAddEventModal();
        }
    });

    initDashboard();

    const messageManager = new MessageManager();

    // Function to display messages
    function displayMessages() {
        const inboxList = document.getElementById('inbox-list');
        const sentList = document.getElementById('sent-list');
        const unreadCountElement = document.getElementById('unread-messages-count');

        if (!inboxList || !sentList) return;

        inboxList.innerHTML = '';
        sentList.innerHTML = '';

        const receivedMessages = messageManager.getReceivedMessages(actualUser);
        const sentMessages = messageManager.getSentMessages(actualUser);
        const unreadCount = messageManager.getUnreadMessageCount(actualUser);

        if (unreadCountElement) {
            unreadCountElement.textContent = unreadCount > 0 ? `(${unreadCount})` : '';
        }

        if (receivedMessages.length > 0) {
            receivedMessages.forEach(msg => {
                const messageItem = createMessageItem(msg, 'received');
                inboxList.appendChild(messageItem);
            });
        } else {
            inboxList.innerHTML = '<p>No tienes mensajes en tu bandeja de entrada.</p>';
        }

        if (sentMessages.length > 0) {
            sentMessages.forEach(msg => {
                const messageItem = createMessageItem(msg, 'sent');
                sentList.appendChild(messageItem);
            });
        } else {
            sentList.innerHTML = '<p>No has enviado ningún mensaje.</p>';
        }
    }

    function createMessageItem(msg, type) {
        const item = document.createElement('div');
        item.classList.add('message-item');
        if (!msg.read && type === 'received') {
            item.classList.add('unread');
        }

        const senderName = users[msg.sender] ? users[msg.sender].name : msg.sender;
        const receiverName = users[msg.receiver] ? users[msg.receiver].name : msg.receiver;

        item.innerHTML = `
            <div class="message-header">
                <span>${type === 'received' ? `De: ${escapeHtml(senderName)}` : `Para:
                    ${escapeHtml(receiverName)}`}</span>
                <span>${escapeHtml(msg.timestamp)}</span>
            </div>
            <div class="message-content">
                <p>${escapeHtml(msg.subject)}</p>
                <p>${escapeHtml(msg.body)}</p>
            </div>
            <div class="message-actions">`;
        if (type === 'received') {
            item.innerHTML += `<button class="view-message-btn" data-message-id="${escapeHtml(msg.id)}">Ver</button>`;
        }
        item.innerHTML += `<button class="delete-message-btn" data-message-id="${escapeHtml(msg.id)}">Eliminar</button></div>`;
 return item;
    }

    function showMessageDetails(messageId) {
 const message = messageManager.getMessageById(messageId);
 if (message) {
            alert(`
 De: ${users[message.sender] ? users[message.sender].name : message.sender}
 Para: ${users[message.receiver] ? users[message.receiver].name : message.receiver}
 Asunto: ${message.subject}
 Fecha: ${new Date(message.timestamp).toLocaleString()}
 Mensaje: ${message.body}
 `);
 messageManager.markAsRead(messageId);
 displayMessages(); // Refresh message list to update read status
 }
    }

    function setupMessageEventListeners() {
 const inboxList = document.getElementById('inbox-list');
 const sentList = document.getElementById('sent-list');
 const sendMessageBtn = document.getElementById('send-message-btn');
 const newMessageModal = document.getElementById('new-message-modal');
 const closeMessageModalBtn = document.getElementById('close-message-modal');
 const messageForm = document.getElementById('message-form');
 const recipientSelect = document.getElementById('message-recipient');

        if (inboxList) {
 inboxList.addEventListener('click', (event) => {
 if (event.target.classList.contains('view-message-btn')) {
 const messageId = event.target.dataset.messageId;
 showMessageDetails(messageId);
 } else if (event.target.classList.contains('delete-message-btn')) {
 const messageId = event.target.dataset.messageId;
 if (confirm('¿Estás seguro de que quieres eliminar este mensaje?')) {
 messageManager.deleteMessage(messageId);
 displayMessages();
 }
 }
 });
        }

        if (sentList) {
 sentList.addEventListener('click', (event) => {
 if (event.target.classList.contains('view-message-btn')) {
 const messageId = event.target.dataset.messageId;
 showMessageDetails(messageId);
 } else if (event.target.classList.contains('delete-message-btn')) {
 const messageId = event.target.dataset.messageId;
 if (confirm('¿Estás seguro de que quieres eliminar este mensaje?')) {
 messageManager.deleteMessage(messageId);
 displayMessages();
 }
 }
 });
        }

        if (sendMessageBtn) {
 sendMessageBtn.addEventListener('click', () => {
 if (newMessageModal) newMessageModal.style.display = 'block';
 // Populate recipient select
 if (recipientSelect) {
 recipientSelect.innerHTML = '<option value="">Selecciona un destinatario</option>';
 messageManager.getAllUsernames().forEach(username => {
 if (username !== actualUser) { // Don't allow sending to self for now
 const option = document.createElement('option');
 option.value = username;
 option.textContent = users[username] ? users[username].name : username;
 recipientSelect.appendChild(option);
 }
 });
 }
 });
        }

        if (closeMessageModalBtn) {
 closeMessageModalBtn.addEventListener('click', () => {
 if (newMessageModal) newMessageModal.style.display = 'none';
 });
        }

        if (messageForm) {
 messageForm.addEventListener('submit', (event) => {
 event.preventDefault();
 const recipient = document.getElementById('message-recipient').value;
 const subject = document.getElementById('message-subject').value;
 const body = document.getElementById('message-body').value;

 if (!recipient || !subject || !body) {
 alert('Por favor, completa todos los campos del mensaje.');
 return;
 }

 messageManager.sendMessage(actualUser, recipient, subject, body);
 alert('Mensaje enviado con éxito.');
 messageForm.reset();
 if (newMessageModal) newMessageModal.style.display = 'none';
 displayMessages(); // Refresh messages after sending
 });
        }
    }

    // Extend initDashboard to include message functionality
    const originalInitDashboard = initDashboard;
 initDashboard = () => {
 originalInitDashboard();
 displayMessages();
 setupMessageEventListeners();
    };

    // Re-call initDashboard to ensure message functionality is initialized
 initDashboard();
});a