// Configuraciones del Dashboard
class DashboardConfig {
    constructor() {
        this.viewingUser = localStorage.getItem('viewingUser');
        this.currentUser = localStorage.getItem('currentUser');
        this.actualUser = this.viewingUser || this.currentUser;
        this.users = JSON.parse(localStorage.getItem('users')) || {};
        this.init();
    }

    init() {
        this.applyUserTheme();
        this.loadUserPreferences();
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
        
        // Aquí se pueden cargar otras preferencias como:
        // - Configuración del calendario
        // - Preferencias de notificaciones
        // - Configuración de widgets
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

    // Actualizar configuración del usuario
    updateUserConfig(newConfig) {
        if (!this.actualUser || !this.users[this.actualUser]) return false;

        try {
            // Actualizar configuración
            Object.assign(this.users[this.actualUser], newConfig);
            localStorage.setItem('users', JSON.stringify(this.users));
            
            // Aplicar cambios inmediatamente
            this.applyUserTheme();
            
            return true;
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
    applyConfigChanges() {
        // Este método se llama cuando se regresa desde configuracion.html
        this.users = JSON.parse(localStorage.getItem('users')) || {};
        this.applyUserTheme();
        
        // Limpiar la bandera de cambios
        localStorage.removeItem('configChanged');
    }
    
    // Verificar si hay cambios pendientes
    checkForConfigChanges() {
        const configChanged = localStorage.getItem('configChanged');
        if (configChanged === 'true') {
            this.applyConfigChanges();
        }
    }
}

// Inicializar configuración cuando se carga el dashboard
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardConfig = new DashboardConfig();
});

// Función global para aplicar cambios cuando se regresa de configuraciones
function refreshDashboardConfig() {
    if (window.dashboardConfig) {
        window.dashboardConfig.checkForConfigChanges();
    }
}

// Verificar cambios cuando la página se vuelve visible (por si se regresa de otra pestaña)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.dashboardConfig) {
        window.dashboardConfig.checkForConfigChanges();
    }
});
