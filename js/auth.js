// Sistema de usuarios mejorado
function safeParseJSON(str, fallback) {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch (e) {
    console.warn('Error parseando JSON:', e);
    return fallback;
  }
}

const defaultUsers = {
  admin: {
    password: 'adminpass',
    name: 'Administrador',
    color: '#2c3e50',
    email: 'admin@nfta-corp.com',
    role: 'admin',
    googleConnected: false,
    lastLogin: null,
    events: [],
    sharedEvents: []
  },
  user1: {
    password: '1234',
    name: 'Marcelo del Valle',
    color: '#27ae60',
    email: 'marcelo@nfta-corp.com',
    role: 'user',
    googleConnected: false,
    lastLogin: null,
    events: [],
    sharedEvents: []
  },
  user2: {
    password: 'user2pass',
    name: 'Usuario 2',
    color: '#3498db',
    email: 'user2@nfta-corp.com',
    role: 'user',
    googleConnected: false,
    lastLogin: null,
    events: [],
    sharedEvents: []
  },
  user3: {
    password: 'user3pass',
    name: 'Usuario 3',
    color: '#e74c3c',
    email: 'user3@nfta-corp.com',
    role: 'user',
    googleConnected: false,
    lastLogin: null,
    events: [],
    sharedEvents: []
  },
  user4: {
    password: 'user4pass',
    name: 'Usuario 4',
    color: '#9b59b6',
    email: 'user4@nfta-corp.com',
    role: 'user',
    googleConnected: false,
    lastLogin: null,
    events: [],
    sharedEvents: []
  }
};

let users = safeParseJSON(localStorage.getItem('users'), null) || defaultUsers;
if (!localStorage.getItem('users')) {
  localStorage.setItem('users', JSON.stringify(users));
}

let sharedEvents = safeParseJSON(localStorage.getItem('sharedEvents'), []);
if (!Array.isArray(sharedEvents)) {
  sharedEvents = [];
  localStorage.setItem('sharedEvents', JSON.stringify(sharedEvents));
}

// Cargar usuarios disponibles dinámicamente
function loadAvailableUsers() {
  const userSelect = document.getElementById('userSelect');
  if (!userSelect) return;
  userSelect.innerHTML = '<option value="">Selecciona tu usuario</option>';

  Object.keys(users).sort().forEach(username => {
    const user = users[username];
    const option = document.createElement('option');
    option.value = username;
    option.textContent = `${user.name}${user.role === 'admin' ? ' (admin)' : ''}${user.googleConnected ? ' (Google)' : ''}`;
    userSelect.appendChild(option);
  });
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

let pendingGoogleConnectUser = null;

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

function handleGoogleSignIn(response) {
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
      // Conflicto si otro usuario ya tiene ese email
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
      localStorage.setItem('users', JSON.stringify(users));
      pendingGoogleConnectUser = null;
      alert('Cuenta de Google conectada correctamente.');
      loadAvailableUsers();
      return;
    }

    // Buscar usuario por email
    const existingUsername = Object.keys(users).find(u => users[u].email === googleUser.email);
    if (existingUsername) {
      users[existingUsername].googleConnected = true;
      users[existingUsername].lastLogin = new Date().toISOString();
      users[existingUsername].picture = googleUser.picture;
      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem('currentUser', existingUsername);
      if (users[existingUsername].role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'dashboard.html';
      }
    } else {
      // Crear nombre de usuario único basado en el email
      const base = (googleUser.email.split('@')[0] || 'user').replace(/[^a-z0-9_\-\.]/gi, '').toLowerCase() || 'user';
      let newUsername = base;
      let idx = 1;
      while (users[newUsername]) {
        newUsername = base + idx++;
      }
      users[newUsername] = {
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
      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem('currentUser', newUsername);
      window.location.href = 'dashboard.html';
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
document.addEventListener('DOMContentLoaded', function() {
  loadAvailableUsers();
  initializeGoogleAuth();

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(event) {
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

      // Validación con contraseña local; para cuentas Google, usar "Iniciar sesión con Google"
      if (users[user].password && users[user].password === pass) {
        users[user].lastLogin = new Date().toISOString();
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', user);

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
