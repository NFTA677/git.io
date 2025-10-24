// Sistema de usuarios con base de datos
// Nota: Requiere un backend con API REST para manejar la base de datos

// Configuración de la API
const API_BASE_URL = '/api'; // Ajustar según tu backend

// Estado en memoria (cache local)
let users = {};
let sharedEvents = [];
let currentUser = null;
let pendingGoogleConnectUser = null;

// Funciones de API para comunicarse con la base de datos
async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Cargar usuarios desde la base de datos
async function loadUsersFromDB() {
  try {
    const data = await apiRequest('/users');
    users = data.users || {};
    return users;
  } catch (error) {
    console.error('Error cargando usuarios:', error);
    // Fallback a usuarios por defecto si falla la conexión
    users = {};
    return users;
  }
}

// Guardar usuario en la base de datos
async function saveUserToDB(username, userData) {
  try {
    await apiRequest(`/users/${username}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
    users[username] = userData;
    return true;
  } catch (error) {
    console.error('Error guardando usuario:', error);
    return false;
  }
}

// Crear nuevo usuario en la base de datos
async function createUserInDB(username, userData) {
  try {
    await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify({ username, ...userData })
    });
    users[username] = userData;
    return true;
  } catch (error) {
    console.error('Error creando usuario:', error);
    return false;
  }
}

// Cargar eventos compartidos desde la base de datos
async function loadSharedEventsFromDB() {
  try {
    const data = await apiRequest('/events/shared');
    sharedEvents = data.events || [];
    return sharedEvents;
  } catch (error) {
    console.error('Error cargando eventos compartidos:', error);
    sharedEvents = [];
    return sharedEvents;
  }
}

// Guardar eventos compartidos en la base de datos
async function saveSharedEventsToDB(events) {
  try {
    await apiRequest('/events/shared', {
      method: 'PUT',
      body: JSON.stringify({ events })
    });
    sharedEvents = events;
    return true;
  } catch (error) {
    console.error('Error guardando eventos compartidos:', error);
    return false;
  }
}

// Cargar usuarios disponibles dinámicamente
async function loadAvailableUsers() {
  const userSelect = document.getElementById('userSelect');
  if (!userSelect) return;
  
  userSelect.innerHTML = '<option value="">Cargando usuarios...</option>';
  
  try {
    await loadUsersFromDB();
    userSelect.innerHTML = '<option value="">Selecciona tu usuario</option>';

    Object.keys(users).sort().forEach(username => {
      const user = users[username];
      const option = document.createElement('option');
      option.value = username;
      option.textContent = `${user.name}${user.role === 'admin' ? ' (admin)' : ''}${user.googleConnected ? ' (Google)' : ''}`;
      userSelect.appendChild(option);
    });
  } catch (error) {
    userSelect.innerHTML = '<option value="">Error cargando usuarios</option>';
  }
}

// Decodificar JWT (base64url)
function parseJwt(token) {
  if (!token) return null;
  const base64Url = token.split('.')[1];
  if (!base64Url) return null;
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const jsonPayload = decodeURIComponent(atob(padded).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  return JSON.parse(jsonPayload);
}

// Autenticación con Google
function initializeGoogleAuth() {
  if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
    google.accounts.id.initialize({
      client_id: 'YOUR_GOOGLE_CLIENT_ID', // Reemplazar con tu Client ID real
      callback: handleGoogleSignIn,
      auto_select: false
    });
  } else {
    console.warn('Google Identity Services no está disponible.');
  }
}

async function handleGoogleSignIn(response) {
  try {
    const payload = parseJwt(response.credential);
    if (!payload) throw new Error('Token inválido');
    
    const googleUser = {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      googleId: payload.sub
    };

    if (pendingGoogleConnectUser) {
      const target = users[pendingGoogleConnectUser];
      if (!target) {
        alert('Usuario para conectar no encontrado.');
        pendingGoogleConnectUser = null;
        return;
      }
      
      // Verificar conflictos en la base de datos
      const conflict = Object.keys(users).find(u => u !== pendingGoogleConnectUser && users[u].email === googleUser.email);
      if (conflict) {
        alert('Esa cuenta de Google ya está asociada a otro usuario.');
        pendingGoogleConnectUser = null;
        return;
      }
      
      target.googleConnected = true;
      target.email = googleUser.email;
      target.picture = googleUser.picture || target.picture;
      target.lastLogin = new Date().toISOString();
      
      const saved = await saveUserToDB(pendingGoogleConnectUser, target);
      pendingGoogleConnectUser = null;
      
      if (saved) {
        alert('Cuenta de Google conectada correctamente.');
        loadAvailableUsers();
      } else {
        alert('Error al conectar la cuenta de Google.');
      }
      return;
    }

    // Buscar usuario por email
    const existingUsername = Object.keys(users).find(u => users[u].email === googleUser.email);
    if (existingUsername) {
      users[existingUsername].googleConnected = true;
      users[existingUsername].lastLogin = new Date().toISOString();
      users[existingUsername].picture = googleUser.picture;
      
      await saveUserToDB(existingUsername, users[existingUsername]);
      currentUser = existingUsername;
      
      if (users[existingUsername].role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'dashboard.html';
      }
    } else {
      // Crear nuevo usuario
      const base = (googleUser.email.split('@')[0] || 'user').replace(/[^a-z0-9_\-\.]/gi, '').toLowerCase() || 'user';
      let newUsername = base;
      let idx = 1;
      while (users[newUsername]) {
        newUsername = base + idx++;
      }
      
      const newUser = {
        password: '',
        name: googleUser.name,
        color: '#3498db',
        email: googleUser.email,
        role: 'user',
        googleConnected: true,
        lastLogin: new Date().toISOString(),
        picture: googleUser.picture,
        events: [],
        sharedEvents: []
      };
      
      const created = await createUserInDB(newUsername, newUser);
      if (created) {
        currentUser = newUsername;
        window.location.href = 'dashboard.html';
      } else {
        alert('Error al crear el usuario.');
      }
    }
  } catch (error) {
    console.error('Error al procesar Google Sign-In:', error);
    alert('Error al iniciar sesión con Google');
  }
}

// Conectar Google a un usuario existente
function connectGoogleToUser(username) {
  if (!users[username]) {
    alert('Usuario no encontrado.');
    return;
  }
  pendingGoogleConnectUser = username;
  if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        pendingGoogleConnectUser = null;
      }
    });
  } else {
    alert('Google Sign-In no está disponible. Asegúrate de tener conexión a internet.');
    pendingGoogleConnectUser = null;
  }
}

// Autenticación tradicional
document.addEventListener('DOMContentLoaded', async function() {
  await loadAvailableUsers();
  initializeGoogleAuth();

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(event) {
      event.preventDefault();

      const user = document.getElementById('userSelect').value;
      const pass = document.getElementById('password').value;

      if (!user) {
        alert('Selecciona un usuario');
        return;
      }
      if (!users[user]) {
        alert('Usuario no encontrado');
        return;
      }

      // Validación con contraseña local
      if (users[user].password && users[user].password === pass) {
        users[user].lastLogin = new Date().toISOString();
        await saveUserToDB(user, users[user]);
        currentUser = user;

        if (users[user].role === 'admin') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      } else if (!users[user].password && users[user].googleConnected) {
        alert('Usuario sin contraseña local. Usa "Iniciar sesión con Google".');
      } else {
        alert('Usuario o contraseña incorrectos');
      }
    });
  }
});
