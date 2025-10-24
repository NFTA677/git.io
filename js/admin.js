document.addEventListener('DOMContentLoaded', () => {

    // Basic HTML escaping to avoid injection when using innerHTML
    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"'`=\/]/g, s =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' }[s])
        );
    }

    function getQueryParam(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    // API functions to interact with database
    async function fetchUsers() {
        try {
            const response = await fetch('/api/users');
            if (!response.ok) throw new Error('Failed to fetch users');
            return await response.json();
        } catch (error) {
            console.error('Error fetching users:', error);
            return {};
        }
    }

    async function getCurrentUser() {
        try {
            const response = await fetch('/api/current-user');
            if (!response.ok) throw new Error('Failed to fetch current user');
            const data = await response.json();
            return data.username || null;
        } catch (error) {
            console.error('Error fetching current user:', error);
            return getQueryParam('currentUser') || null;
        }
    }

    async function updateUserSession(username) {
        try {
            await fetch('/api/user-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
        } catch (error) {
            console.error('Error updating user session:', error);
        }
    }

    async function logout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }

    // In-memory cache for performance
    const cache = {
        users: {},
        currentUser: null,
        lastFetch: 0
    };

    async function getUsers() {
        const now = Date.now();
        // Refresh cache every 5 minutes
        if (now - cache.lastFetch > 300000) {
            cache.users = await fetchUsers();
            cache.lastFetch = now;
        }
        return cache.users;
    }

    async function getCurrentUsername() {
        if (!cache.currentUser) {
            cache.currentUser = await getCurrentUser();
        }
        return cache.currentUser;
    }

    async function initAdminPanel() {
        setupEventListeners();
        await loadUserData();
        await displayAdminName();
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

    async function handleLogout() {
        console.log('Logging out...');
        await logout();
        cache.currentUser = null;
        cache.users = {};
        window.location.href = 'index.html';
    }

    async function loadUserData() {
        const users = await getUsers();
        const userListContainer = document.getElementById('user-list');
        if (!userListContainer) return;

        userListContainer.innerHTML = '<p>Cargando usuarios...</p>';

        const userCards = [];
        for (const username in users) {
            if (Object.prototype.hasOwnProperty.call(users, username)) {
                const user = users[username] || {};
                const userCard = createUserCard(username, user);
                userCards.push(userCard);
            }
        }

        userListContainer.innerHTML = '';
        userCards.forEach(card => userListContainer.appendChild(card));
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

    async function viewUserDashboard(username) {
        const users = await getUsers();
        if (users[username]) {
            await updateUserSession(username);
            window.location.href = `dashboard.html?user=${encodeURIComponent(username)}`;
        } else {
            alert('Usuario no encontrado.');
        }
    }

    async function displayAdminName() {
        const currentUser = await getCurrentUsername();
        if (!currentUser) return;
        const users = await getUsers();
        if (users[currentUser]) {
            const adminNameElement = document.getElementById('admin-name');
            if (adminNameElement) {
                adminNameElement.textContent = users[currentUser].name || currentUser;
            }
        }
    }

    initAdminPanel();
});