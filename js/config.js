// Configuraciones del Dashboard
class DashboardConfig {
    constructor() {
        this.viewingUser = null;
        this.currentUser = null;
        this.actualUser = null;
        this.users = {};
        this.apiBaseUrl = '/api'; // Ajusta según tu configuración
        this.init();
    }

    async init() {
        await this.loadCurrentUser();
        await this.loadUsers();
        this.applyUserTheme();
        this.loadUserPreferences();
    }

    // Cargar usuario actual desde la base de datos
    async loadCurrentUser() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/current-user`);
            if (response.ok) {
                const userData = await response.json();
                this.currentUser = userData.username;
                this.viewingUser = userData.viewingUser || null;
                this.actualUser = this.viewingUser || this.currentUser;
            }
        } catch (error) {
            console.error('Error cargando usuario actual:', error);
        }
    }

    // Cargar usuarios desde la base de datos
    async loadUsers() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/users`);
            if (response.ok) {
                this.users = await response.json();
            }
        } catch (error) {
            console.error('Error cargando usuarios:', error);
        }
    }

    // Aplicar tema del usuario al dashboard
    applyUserTheme() {
        if (!this.actualUser || !this.users[this.actualUser]) return;

        const user = this.users[this.actualUser];
        const color = user.color || '#181818';
        
        // Aplicar color al sidebar
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.style.background = color;
        }

        // Aplicar color a los botones principales
        const primaryButtons = document.querySelectorAll('.add-event-btn, .save-btn');
        primaryButtons.forEach(btn => {
            btn.style.background = color;
            btn.addEventListener('mouseenter', () => {
                btn.style.background = this.darkenColor(color, 20);
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = color;
            });
        });

        // Actualizar nombre de usuario si está disponible
        this.updateUserDisplay();
    }

    // Actualizar la visualización del nombre de usuario
    updateUserDisplay() {
        if (!this.actualUser || !this.users[this.actualUser]) return;
        
        const userName = this.users[this.actualUser].name || this.actualUser;
        
        // Buscar elementos que puedan mostrar el nombre de usuario
        const userElements = document.querySelectorAll('[data-user-name]');
        userElements.forEach(element => {
            element.textContent = userName;
        });

        // Actualizar título de la página si es necesario
        const pageTitle = document.querySelector('title');
        if (pageTitle && pageTitle.textContent.includes('Dashboard')) {
            pageTitle.textContent = `Dashboard - ${userName} | NFTA-CORP`;
        }
    }

    // Cargar preferencias del usuario
    loadUserPreferences() {
        if (!this.actualUser || !this.users[this.actualUser]) return;

        const user = this.users[this.actualUser];
        console.log('Preferencias del usuario cargadas:', user);
    }

    // Oscurecer un color (para efectos hover)
    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    // Actualizar configuración del usuario en la base de datos
    async updateUserConfig(newConfig) {
        if (!this.actualUser) return false;

        try {
            const response = await fetch(`${this.apiBaseUrl}/users/${this.actualUser}/config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newConfig)
            });

            if (response.ok) {
                // Actualizar configuración local
                if (this.users[this.actualUser]) {
                    Object.assign(this.users[this.actualUser], newConfig);
                }
                
                // Aplicar cambios inmediatamente
                this.applyUserTheme();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error actualizando configuración:', error);
            return false;
        }
    }

    // Obtener configuración actual del usuario
    getUserConfig() {
        if (!this.actualUser || !this.users[this.actualUser]) return null;
        return this.users[this.actualUser];
    }

    // Aplicar cambios de configuración desde configuracion.html
    async applyConfigChanges() {
        await this.loadUsers();
        this.applyUserTheme();
    }
    
    // Verificar si hay cambios pendientes
    async checkForConfigChanges() {
        // Recargar datos desde la base de datos para obtener cambios
        await this.loadUsers();
        this.applyUserTheme();
    }

    // Establecer usuario que se está visualizando
    async setViewingUser(username) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/set-viewing-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ viewingUser: username })
            });

            if (response.ok) {
                this.viewingUser = username;
                this.actualUser = username || this.currentUser;
                this.applyUserTheme();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error estableciendo usuario de visualización:', error);
            return false;
        }
    }
}

// Inicializar configuración cuando se carga el dashboard
document.addEventListener('DOMContentLoaded', async () => {
    window.dashboardConfig = new DashboardConfig();
});

// Función global para aplicar cambios cuando se regresa de configuraciones
async function refreshDashboardConfig() {
    if (window.dashboardConfig) {
        await window.dashboardConfig.checkForConfigChanges();
    }
}

// Verificar cambios cuando la página se vuelve visible
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && window.dashboardConfig) {
        await window.dashboardConfig.checkForConfigChanges();
    }
});
