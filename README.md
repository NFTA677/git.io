# NFTA-CORP - Sistema de Gestión Empresarial

## 🚀 Características Implementadas

### ✅ Sistema de Autenticación Mejorado
- **Inicio de sesión tradicional** con usuarios predefinidos
- **Integración con Google Sign-In** para autenticación OAuth
- **Gestión dinámica de usuarios** desde el panel de administración
- **Indicadores visuales** de conexión con Google (🔗)
- **Persistencia de sesiones** en localStorage

### ✅ Catálogo Interactivo con Subida de Imágenes
- **Subida de imágenes** por usuarios autenticados
- **Modal de agregar productos** con formulario completo
- **Vista previa de imágenes** antes de subir
- **Categorización de productos** (Hardware, Software, Servicios)
- **Información del autor** en cada producto
- **Sistema de filtros** y búsqueda
- **Ordenamiento** por precio y fecha

### ✅ Sistema de Eventos Categorizado y Compartido
- **8 categorías de eventos** con iconos y colores únicos:
  - 💼 Trabajo
  - 👤 Personal  
  - 🤝 Reunión
  - ⏰ Entrega
  - 🎉 Social
  - 🏥 Salud
  - ✈️ Viaje
  - 📚 Educación
- **Compartir eventos** entre usuarios
- **Descripción de eventos** opcional
- **Estados de eventos** (Pendiente, Completado, Programado)
- **Niveles de importancia** (Alta, Media, Baja)
- **Vista unificada** de eventos propios y compartidos

### ✅ Widgets de Google Integrados
- **Gmail embebido** con botón de actualización
- **Google Drive** con soporte para carpetas específicas
- **Google Calendar** integrado
- **Botones de actualización** para cada servicio
- **Diseño responsivo** y moderno

### ✅ Diseño Unificado y Moderno
- **Variables CSS** para consistencia visual
- **Componentes reutilizables** (botones, tarjetas, modales)
- **Sistema de colores** coherente
- **Animaciones suaves** y transiciones
- **Diseño responsivo** para móviles y tablets
- **Tipografía moderna** (SF Pro Display)

## 🎨 Paleta de Colores

```css
--primary-color: #667eea
--secondary-color: #764ba2
--success-color: #28a745
--warning-color: #ffc107
--danger-color: #dc3545
--info-color: #17a2b8
```

## 📁 Estructura de Archivos

```
N.F.T.A-CORP/
├── index.html              # Página de inicio de sesión
├── dashboard.html          # Dashboard principal
├── catalogo.html          # Catálogo de productos
├── admin.html             # Panel de administración
├── configuracion.html     # Configuraciones de usuario
├── css/
│   ├── style.css          # Estilos principales unificados
│   └── admin.css          # Estilos específicos del admin
├── js/
│   ├── auth.js            # Sistema de autenticación
│   ├── dashboard.js       # Funcionalidades del dashboard
│   ├── admin.js           # Funcionalidades del admin
│   ├── common.js          # Funciones comunes
│   └── config.js          # Configuraciones
└── assets/                # Imágenes y recursos
```

## 🔧 Funcionalidades por Usuario

### Usuarios Regulares
- ✅ Acceso al dashboard personal
- ✅ Crear y gestionar eventos propios
- ✅ Compartir eventos con otros usuarios
- ✅ Agregar productos al catálogo
- ✅ Subir imágenes para productos
- ✅ Acceso a widgets de Google
- ✅ Personalizar configuración

### Administrador
- ✅ Todas las funcionalidades de usuarios
- ✅ Panel de administración completo
- ✅ Gestión de usuarios del sistema
- ✅ Vista de dashboards de otros usuarios
- ✅ Configuraciones del sistema
- ✅ Reportes y estadísticas

## 🚀 Cómo Usar

### 1. Iniciar Sesión
- Accede a `index.html`
- Selecciona tu usuario de la lista
- Ingresa tu contraseña
- O usa "Iniciar sesión con Google" (requiere configuración)

### 2. Dashboard
- Ve tus eventos categorizados
- Crea nuevos eventos con categorías
- Comparte eventos con otros usuarios
- Accede a Gmail, Drive y Calendar

### 3. Catálogo
- Explora productos existentes
- Haz clic en "➕ Agregar Producto"
- Completa el formulario con imagen
- Los productos se guardan automáticamente

### 4. Administración (Solo Admin)
- Accede al panel de administración
- Gestiona usuarios del sistema
- Ve dashboards de otros usuarios
- Configura parámetros del sistema

## 🔐 Seguridad

- **Autenticación local** con usuarios y contraseñas
- **Integración OAuth** con Google (opcional)
- **Persistencia segura** en localStorage
- **Validación de permisos** por rol de usuario

## 📱 Responsive Design

- **Mobile First** approach
- **Breakpoints** para tablets y móviles
- **Navegación adaptativa**
- **Componentes flexibles**

## 🎯 Próximas Mejoras

- [ ] Base de datos real (actualmente usa localStorage)
- [ ] Notificaciones en tiempo real
- [ ] Sincronización con Google Calendar API
- [ ] Sistema de permisos más granular
- [ ] Exportación de reportes
- [ ] Temas personalizables
- [ ] API REST para integraciones

## 🛠️ Configuración Técnica

### Google Sign-In
Para habilitar Google Sign-In, reemplaza `YOUR_GOOGLE_CLIENT_ID` en `js/auth.js` con tu Client ID real de Google Cloud Console.

### Variables de Entorno
El sistema funciona completamente con localStorage, no requiere configuración de base de datos.

## 📞 Soporte

Para soporte técnico o preguntas sobre el sistema, contacta al equipo de desarrollo de NFTA-CORP.

---

**NFTA-CORP** - Sistema de Gestión Empresarial Moderno y Eficiente
