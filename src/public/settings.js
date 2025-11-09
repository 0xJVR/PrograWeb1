// Variables globales
let currentUser = null;
let selectedColorIndex = 0;
const token = localStorage.getItem('token');

// Gradientes
const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)'
];

// Verificar autenticación
if (!token) {
  window.location.href = '/login.html';
}

// Cargar datos del usuario al iniciar
document.addEventListener('DOMContentLoaded', async () => {
  await loadUserProfile();
  loadGradients();
  setupEventListeners();
});

// Cargar perfil del usuario
async function loadUserProfile() {
  try {
    const response = await fetch('/api/users/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Error al cargar perfil');
    
    const data = await response.json();
    currentUser = data.user;

    // Rellenar formulario de perfil
    document.getElementById('profileName').value = currentUser.name;
    document.getElementById('profileEmail').value = currentUser.email;
    
    // Rellenar información de cuenta
    document.getElementById('createdDate').textContent = new Date(currentUser.createdAt).toLocaleDateString();
    document.getElementById('userRoleInfo').textContent = currentUser.role === 'admin' ? 'Administrador' : 'Usuario';

    // Mostrar enlace de admin si es necesario
    if (currentUser.role === 'admin') {
      document.getElementById('adminPanelLink').style.display = 'flex';
    }

    // Actualizar avatar en header
    updateUserAvatar();

    // Seleccionar color actual
    selectedColorIndex = currentUser.profileColor || 0;
    updatePreviewAvatar();
    highlightSelectedGradient();

  } catch (error) {
    console.error('Error:', error);
    showAlert('profileAlert', 'Error al cargar perfil', 'error');
  }
}

// Cargar gradientes disponibles
function loadGradients() {
  const gradientGrid = document.getElementById('gradientGrid');
  gradientGrid.innerHTML = '';

  GRADIENTS.forEach((gradient, index) => {
    const div = document.createElement('div');
    div.className = 'gradient-item';
    div.style.background = gradient;
    div.dataset.index = index;
    div.addEventListener('click', () => selectGradient(index));
    gradientGrid.appendChild(div);
  });
}

// Seleccionar gradiente
function selectGradient(index) {
  selectedColorIndex = index;
  highlightSelectedGradient();
  updatePreviewAvatar();
}

// Destacar gradiente seleccionado
function highlightSelectedGradient() {
  document.querySelectorAll('.gradient-item').forEach((item, index) => {
    item.classList.toggle('selected', index === selectedColorIndex);
  });
}

// Actualizar vista previa del avatar
function updatePreviewAvatar() {
  const preview = document.getElementById('previewAvatar');
  preview.style.background = GRADIENTS[selectedColorIndex];
  const initials = (currentUser.name?.charAt(0) || currentUser.email?.charAt(0) || 'U').toUpperCase();
  preview.textContent = initials;
}

// Actualizar avatar en el header
function updateUserAvatar() {
  const userAvatar = document.getElementById('userAvatar');
  if (userAvatar) {
    const gradient = GRADIENTS[currentUser.profileColor || 0];
    userAvatar.style.background = gradient;
    const initials = (currentUser.name?.charAt(0) || currentUser.email?.charAt(0) || 'U').toUpperCase();
    userAvatar.textContent = initials;
  }
  const userName = document.getElementById('userName');
  if (userName) userName.textContent = currentUser.name || currentUser.email.split('@')[0];
  const userRole = document.getElementById('userRole');
  if (userRole) userRole.textContent = currentUser.role === 'admin' ? 'Admin' : 'Usuario';
}

// Setup de event listeners
function setupEventListeners() {
  // Navegación entre secciones
  document.querySelectorAll('.settings-menu-item').forEach(item => {
    if (!item.href) {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        switchSection(section);
      });
    }
  });

  // Formulario de perfil (solo nombre)
  document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);

  // Botón guardar color
  document.getElementById('saveColorBtn').addEventListener('click', handleColorUpdate);

  // Formulario de contraseña
  document.getElementById('passwordForm').addEventListener('submit', handlePasswordChange);

  // Botón eliminar cuenta
  document.getElementById('deleteAccountBtn').addEventListener('click', showDeleteConfirmation);

  // Modal de confirmación
  document.getElementById('closeConfirmModal').addEventListener('click', closeConfirmModal);
  document.getElementById('cancelConfirmBtn').addEventListener('click', closeConfirmModal);
  document.getElementById('confirmBtn').addEventListener('click', handleConfirmation);

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.href = '/login.html';
    });
  }
}

// Cambiar sección
function switchSection(sectionName) {
  // Ocultar todas las secciones
  document.querySelectorAll('.settings-section').forEach(section => {
    section.classList.remove('active');
  });

  // Remover active de todos los items del menú
  document.querySelectorAll('.settings-menu-item').forEach(item => {
    item.classList.remove('active');
  });

  // Mostrar sección seleccionada
  document.getElementById(`${sectionName}-section`).classList.add('active');

  // Marcar item del menú como active
  document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
}

// Actualizar perfil (solo nombre)
async function handleProfileUpdate(e) {
  e.preventDefault();

  const data = {
    name: document.getElementById('profileName').value
  };

  try {
    const response = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.message);

    currentUser = result.user;
    updateUserAvatar();
    showAlert('profileAlert', 'Perfil actualizado exitosamente', 'success');
  } catch (error) {
    console.error('Error:', error);
    showAlert('profileAlert', error.message, 'error');
  }
}

// Actualizar color de perfil
async function handleColorUpdate() {
  try {
    const response = await fetch('/api/users/profile-color', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ colorIndex: selectedColorIndex })
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.message);

    currentUser.profileColor = result.profileColor;
    updateUserAvatar();
    updatePreviewAvatar();
    highlightSelectedGradient();
    showAlert('appearanceAlert', 'Color actualizado exitosamente', 'success');
  } catch (error) {
    console.error('Error:', error);
    showAlert('appearanceAlert', error.message, 'error');
  }
}

// Cambiar contraseña
async function handlePasswordChange(e) {
  e.preventDefault();

  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  try {
    const response = await fetch('/api/users/change-password', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.message);

    document.getElementById('passwordForm').reset();
    showAlert('passwordAlert', 'Contraseña actualizada exitosamente', 'success');
  } catch (error) {
    console.error('Error:', error);
    showAlert('passwordAlert', error.message, 'error');
  }
}

// Mostrar confirmación de eliminación
function showDeleteConfirmation() {
  document.getElementById('confirmTitle').textContent = 'Eliminar Cuenta';
  document.getElementById('confirmMessage').textContent = '¿Estás seguro de que deseas eliminar tu cuenta? Esta acción es irreversible.';
  
  const confirmExtra = document.getElementById('confirmExtra');
  confirmExtra.innerHTML = '<input type="password" id="deletePassword" placeholder="Ingresa tu contraseña para confirmar" style="width: 100%; padding: 0.5rem; margin-top: 1rem; border: 1px solid #ddd; border-radius: 4px;">';
  
  window.confirmAction = 'deleteAccount';
  document.getElementById('confirmModal').style.display = 'flex';
}

// Cerrar modal de confirmación
function closeConfirmModal() {
  document.getElementById('confirmModal').style.display = 'none';
  document.getElementById('confirmExtra').innerHTML = '';
}

// Manejar confirmación
async function handleConfirmation() {
  if (window.confirmAction === 'deleteAccount') {
    const password = document.getElementById('deletePassword')?.value;
    if (!password) {
      alert('Por favor ingresa tu contraseña');
      return;
    }

    try {
      const response = await fetch('/api/users/account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.message);

      alert('Cuenta eliminada exitosamente');
      localStorage.removeItem('token');
      window.location.href = '/';
    } catch (error) {
      alert('Error: ' + error.message);
    }
  }
  closeConfirmModal();
}

// Mostrar alerta
function showAlert(containerId, message, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => {
    container.innerHTML = '';
  }, 5000);
}
