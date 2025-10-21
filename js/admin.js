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

    // Basic HTML escaping to avoid injection when using innerHTML
    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"'`=\/]/g, s =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' }[s])
        );
    }

    function initAdminPanel() {
        setupEventListeners();
        loadUserData();
        displayAdminName();
    }

    function setupEventListeners() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        const userListContainer = document.getElementById('user-list');
        if (userListContainer) {
            userListContainer.addEventListener('click', (event) => {
                if (event.target.classList.contains('view-user-btn')) {
                    const username = event.target.dataset.username;
                    viewUserDashboard(username);
                }
            });
        }
    }

    function handleLogout() {
        console.log('Logging out...');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('viewingUser');
        window.location.href = 'index.html';
    }

    function loadUserData() {
        const users = getUsers();
        const userListContainer = document.getElementById('user-list');
        if (!userListContainer) return;

        userListContainer.innerHTML = '';

        for (const username in users) {
            if (Object.prototype.hasOwnProperty.call(users, username)) {
                const user = users[username] || {};
                const userCard = createUserCard(username, user);
                userListContainer.appendChild(userCard);
            }
        }
    }

    function createUserCard(username, user) {
        const card = document.createElement('div');
        card.classList.add('user-card');
        card.style.borderColor = user.color || '#ccc';

        const lastLoginDate = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Nunca';
        const name = escapeHtml(user.name || '');
        const uname = escapeHtml(username);
        const email = escapeHtml(user.email || 'N/A');
        const roleText = user.role ? escapeHtml(String(user.role).toUpperCase()) : 'N/A';
        const roleClass = user.role ? escapeHtml(String(user.role)) : '';

        card.innerHTML = `
            <h3>${name} (${uname})</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Rol:</strong> <span class="${roleClass}">${roleText}</span></p>
            <p><strong>Último inicio de sesión:</strong> ${escapeHtml(lastLoginDate)}</p>
            <p><strong>Google Conectado:</strong> ${user.googleConnected ? 'Sí' : 'No'}</p>
            <p><strong>Eventos:</strong> ${Array.isArray(user.events) ? user.events.length : 0}</p>
            <button class="view-user-btn" data-username="${uname}">Ver Dashboard</button>
        `;
        return card;
    }

    function viewUserDashboard(username) {
        const users = getUsers();
        if (users[username]) {
            localStorage.setItem('viewingUser', username);
            window.location.href = 'dashboard.html';
        } else {
            alert('Usuario no encontrado.');
        }
    }

    function displayAdminName() {
        const currentUser = getCurrentUsername();
        if (!currentUser) return;
        const users = getUsers();
        if (users[currentUser]) {
            const adminNameElement = document.getElementById('admin-name');
            if (adminNameElement) {
                adminNameElement.textContent = users[currentUser].name || currentUser;
            }
        }
    }

    initAdminPanel();
});