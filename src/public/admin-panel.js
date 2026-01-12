// Variables globales
let currentUser = null;
let currentPage = 1;
let currentUserPage = 1;
const token = localStorage.getItem('token');

// Helper anti-XSS para HTML
function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = String(s ?? '');
  return d.innerHTML;
}

// Helper de moneda EUR
function formatPriceEUR(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n);
  } catch {
    return `${n.toFixed(2)} €`;
  }
}

// Verificar autenticación
if (!token) {
  window.location.href = '/login.html';
}

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', async () => {
  await verifyAdminAccess();
  loadDashboard();
  setupEventListeners();
});

// Verificar que sea admin
async function verifyAdminAccess() {
  try {
    const response = await fetch('/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('No autorizado');

    const data = await response.json();
    currentUser = data.user;

    if (currentUser.role !== 'admin') {
      window.location.href = '/';
      return;
    }
  } catch (error) {
    console.error('Error:', error);
    window.location.href = '/login.html';
  }
}

// Cargar dashboard
async function loadDashboard() {
  try {
    const [statsRes, activityRes] = await Promise.all([
      fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('/api/admin/activity', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);

    if (!statsRes.ok || !activityRes.ok) throw new Error('Error al cargar datos');

    const statsData = await statsRes.json();
    const activityData = await activityRes.json();

    // Mostrar estadísticas
    document.getElementById('totalUsers').textContent = statsData.stats.users.total;
    document.getElementById('newUsersWeek').textContent = statsData.stats.users.newThisWeek;
    document.getElementById('totalProducts').textContent = statsData.stats.products.total;
    document.getElementById('totalMessages').textContent = statsData.stats.messages.total;

    // Mostrar actividad reciente
    displayRecentUsers(activityData.activity.recentUsers);
    displayRecentProducts(activityData.activity.recentProducts);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Mostrar usuarios recientes
function displayRecentUsers(users) {
  const container = document.getElementById('recentUsersList');

  if (!users || users.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999;">No hay usuarios recientes</p>';
    return;
  }

  container.innerHTML = users.map(user => {
    const initial = (user.name && user.name[0]) ? user.name[0].toUpperCase() : ((user.email || 'U')[0]?.toUpperCase() || 'U');
    return `
      <div class="activity-item">
        <div class="activity-avatar" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          ${escapeHtml(initial)}
        </div>
        <div class="activity-info">
          <div class="activity-title">${escapeHtml(user.name || user.email)}</div>
          <div class="activity-subtitle">${escapeHtml(user.email)}</div>
          <div class="activity-date">${new Date(user.createdAt).toLocaleDateString()}</div>
        </div>
        <span class="role-badge">${user.role === 'admin' ? 'Admin' : 'Usuario'}</span>
      </div>
    `;
  }).join('');
}

// Mostrar productos recientes (EUR)
function displayRecentProducts(products) {
  const container = document.getElementById('recentProductsList');

  if (!products || products.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999;">No hay productos recientes</p>';
    return;
  }

  container.innerHTML = products.map(product => `
    <div class="activity-item">
      <div class="activity-avatar">📦</div>
      <div class="activity-info">
        <div class="activity-title">${escapeHtml(product.name)}</div>
        <div class="activity-subtitle">${formatPriceEUR(product.price)}</div>
        <div class="activity-date">${new Date(product.createdAt).toLocaleDateString('es-ES')}</div>
      </div>
    </div>
  `).join('');
}

// Helpers para modales -----------------------------

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  document.body.classList.add('modal-open');

  // Cerrar al hacer click fuera del contenido
  const onOverlayClick = (e) => {
    if (e.target === el) closeModal(id);
  };
  el.__overlayHandler = onOverlayClick;
  el.addEventListener('click', onOverlayClick);

  // Cerrar con ESC
  const onEsc = (e) => {
    if (e.key === 'Escape') closeModal(id);
  };
  el.__escHandler = onEsc;
  document.addEventListener('keydown', onEsc);
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('show');

  if (el.__overlayHandler) {
    el.removeEventListener('click', el.__overlayHandler);
    delete el.__overlayHandler;
  }
  if (el.__escHandler) {
    document.removeEventListener('keydown', el.__escHandler);
    delete el.__escHandler;
  }

  if (!document.querySelector('.modal.show')) {
    document.body.classList.remove('modal-open');
  }
}

// Setup de event listeners
function setupEventListeners() {
  // Navegación entre secciones
  document.querySelectorAll('.admin-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      switchSection(section);
    });
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
  });

  // Usuarios
  document.getElementById('usersSearch').addEventListener('input', () => loadUsers());
  document.getElementById('roleFilter').addEventListener('change', () => loadUsers());

  // Modal: botones
  document.getElementById('closeEditModal').addEventListener('click', closeEditModal);
  document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
  document.getElementById('editUserForm').addEventListener('submit', handleUserUpdate);

  document.getElementById('closeDeleteModal').addEventListener('click', closeDeleteModal);
  document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
  document.getElementById('confirmDeleteBtn').addEventListener('click', handleUserDelete);

  // Cargar usuarios y productos al abrir secciones (fix: seleccionar por clase)
  const adminContent = document.querySelector('.admin-content');
  if (!adminContent) return;

  const observer = new MutationObserver(() => {
    if (document.getElementById('users-section').classList.contains('active')) {
      if (!document.getElementById('usersTableBody').hasContent) {
        loadUsers();
        document.getElementById('usersTableBody').hasContent = true;
      }
    }
    if (document.getElementById('products-section').classList.contains('active')) {
      if (!document.getElementById('productsTableBody').hasContent) {
        loadProducts();
        document.getElementById('productsTableBody').hasContent = true;
      }
    }
    if (document.getElementById('activity-section').classList.contains('active')) {
      if (!document.getElementById('activityUsers').hasContent) {
        loadActivity();
        document.getElementById('activityUsers').hasContent = true;
      }
    }
    if (document.getElementById('orders-section').classList.contains('active')) {
      if (!document.getElementById('ordersTableBody').hasContent) {
        loadOrders();
        document.getElementById('ordersTableBody').hasContent = true;
      }
    }
  });

  observer.observe(adminContent, { attributes: true, subtree: true });
}

// Cambiar sección
function switchSection(sectionName) {
  // Ocultar todas las secciones
  document.querySelectorAll('.admin-section').forEach(section => {
    section.classList.remove('active');
  });

  // Remover active de todos los items del menú
  document.querySelectorAll('.admin-menu-item').forEach(item => {
    item.classList.remove('active');
  });

  // Mostrar sección seleccionada
  document.getElementById(`${sectionName}-section`).classList.add('active');

  // Marcar item del menú como active
  document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

  // Cargar datos si es la primera vez
  if (sectionName === 'users') loadUsers();
  if (sectionName === 'products') loadProducts();
  if (sectionName === 'orders') loadOrders();
  if (sectionName === 'activity') loadActivity();
}

// Cargar usuarios
async function loadUsers(page = 1) {
  try {
    const search = document.getElementById('usersSearch').value;
    const role = document.getElementById('roleFilter').value;
    const limit = 10;

    const params = new URLSearchParams({ page, limit, search, role });
    const response = await fetch(`/api/admin/users?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Error al cargar usuarios');

    const data = await response.json();
    displayUsers(data.users);
    displayPagination(data.pagination, 'usersPagination', loadUsers);
  } catch (error) {
    console.error('Error:', error);
    showAlert('usersAlert', 'Error al cargar usuarios', 'error');
  }
}

// Mostrar usuarios en tabla (sin inline JS, con data-* y listeners)
function displayUsers(users) {
  const tbody = document.getElementById('usersTableBody');

  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No hay usuarios</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => `
    <tr>
      <td>${escapeHtml(user.name || user.email)}</td>
      <td>${escapeHtml(user.email)}</td>
      <td><span class="role-badge">${user.role === 'admin' ? 'Admin' : 'Usuario'}</span></td>
      <td>${new Date(user.createdAt).toLocaleDateString()}</td>
      <td class="action-buttons">
        <button class="btn-small btn-edit" data-id="${user._id}" data-name="${escapeHtml(user.name || '')}" data-role="${user.role}">Editar</button>
        <button class="btn-small btn-delete" data-id="${user._id}" data-name="${escapeHtml(user.name || user.email)}">Eliminar</button>
      </td>
    </tr>
  `).join('');

  // Listeners delegados
  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      openEditModal(btn.dataset.id, btn.dataset.name, btn.dataset.role);
    });
  });
  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      openDeleteModal(btn.dataset.id, btn.dataset.name);
    });
  });
}

// Cargar productos
async function loadProducts(page = 1) {
  try {
    const limit = 10;
    const params = new URLSearchParams({ page, limit });
    const response = await fetch(`/api/admin/products?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Error al cargar productos');

    const data = await response.json();
    displayProducts(data.products);
    displayPagination(data.pagination, 'productsPagination', loadProducts);
  } catch (error) {
    console.error('Error:', error);
    showAlert('productsAlert', 'Error al cargar productos', 'error');
  }
}

// Mostrar productos en tabla (EUR)
function displayProducts(products) {
  const tbody = document.getElementById('productsTableBody');

  if (!products || products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem;">No hay productos</td></tr>';
    return;
  }

  tbody.innerHTML = products.map(product => {
    const created = new Date(product.createdAt);
    const createdStr = isNaN(created) ? '—' : created.toLocaleDateString('es-ES');
    const priceStr = formatPriceEUR(product.price);

    return `
      <tr>
        <td>${escapeHtml(product.name)}</td>
        <td>${priceStr}</td>
        <td>${createdStr}</td>
      </tr>
    `;
  }).join('');
}

// Cargar actividad
async function loadActivity() {
  try {
    const response = await fetch('/api/admin/activity', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Error al cargar actividad');

    const data = await response.json();
    displayActivityUsers(data.activity.recentUsers);
    displayActivityProducts(data.activity.recentProducts);
    displayActivityMessages(data.activity.recentMessages);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Mostrar usuarios en actividad
function displayActivityUsers(users) {
  const container = document.getElementById('activityUsers');

  if (!users || users.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999;">No hay actividad</p>';
    return;
  }

  container.innerHTML = users.map(user => `
    <div class="activity-item">
      <div class="activity-avatar">${escapeHtml((user.name || user.email || 'U').charAt(0).toUpperCase())}</div>
      <div class="activity-info">
        <div class="activity-title">${escapeHtml(user.name || user.email)}</div>
        <div class="activity-subtitle">${escapeHtml(user.email)}</div>
      </div>
      <span class="role-badge">${user.role === 'admin' ? 'Admin' : 'Usuario'}</span>
    </div>
  `).join('');
}

// Mostrar productos en actividad (EUR)
function displayActivityProducts(products) {
  const container = document.getElementById('activityProducts');

  if (!products || products.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999;">No hay actividad</p>';
    return;
  }

  container.innerHTML = products.map(product => `
    <div class="activity-item">
      <div class="activity-avatar">📦</div>
      <div class="activity-info">
        <div class="activity-title">${escapeHtml(product.name)}</div>
        <div class="activity-subtitle">${formatPriceEUR(product.price)}</div>
      </div>
    </div>
  `).join('');
}

// Mostrar mensajes en actividad
function displayActivityMessages(messages) {
  const container = document.getElementById('activityMessages');

  if (!messages || messages.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999;">No hay actividad</p>';
    return;
  }

  container.innerHTML = messages.map(message => `
    <div class="activity-item">
      <div class="activity-avatar">💬</div>
      <div class="activity-info">
        <div class="activity-title">${escapeHtml(message.userName)}</div>
        <div class="activity-subtitle">${escapeHtml(message.content.substring(0, 50))}...</div>
      </div>
    </div>
  `).join('');
}

// Mostrar paginación
function displayPagination(pagination, containerId, callback) {
  const container = document.getElementById(containerId);

  if (pagination.pages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  for (let i = 1; i <= pagination.pages; i++) {
    html += `
      <button class="pagination-btn ${i === pagination.page ? 'active' : ''}" data-page="${i}">
        ${i}
      </button>
    `;
  }
  container.innerHTML = html;

  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => callback(Number(btn.dataset.page)));
  });
}

// Abrir modal de edición
function openEditModal(userId, userName, userRole) {
  document.getElementById('editUserId').value = userId;
  document.getElementById('editUserName').value = userName;
  document.getElementById('editUserRole').value = userRole;
  openModal('editUserModal');
}

// Cerrar modal de edición
function closeEditModal() {
  closeModal('editUserModal');
}

// Actualizar usuario
async function handleUserUpdate(e) {
  e.preventDefault();

  const userId = document.getElementById('editUserId').value;
  const name = document.getElementById('editUserName').value;
  const role = document.getElementById('editUserRole').value;

  try {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, role })
    });

    if (!response.ok) throw new Error('Error al actualizar usuario');

    closeEditModal();
    loadUsers();
    showAlert('usersAlert', 'Usuario actualizado exitosamente', 'success');
  } catch (error) {
    console.error('Error:', error);
    showAlert('usersAlert', error.message, 'error');
  }
}

// Abrir modal de eliminación
function openDeleteModal(userId, userName) {
  document.getElementById('deleteMessage').textContent = `¿Estás seguro de que deseas eliminar a ${userName}?`;
  window.userToDelete = userId;
  openModal('deleteConfirmModal');
}

// Cerrar modal de eliminación
function closeDeleteModal() {
  closeModal('deleteConfirmModal');
}

// Eliminar usuario
async function handleUserDelete() {
  const userId = window.userToDelete;

  try {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Error al eliminar usuario');

    closeDeleteModal();
    loadUsers();
    showAlert('usersAlert', 'Usuario eliminado exitosamente', 'success');
  } catch (error) {
    console.error('Error:', error);
    showAlert('usersAlert', error.message, 'error');
  }
}

// Mostrar alerta
function showAlert(containerId, message, type) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
  setTimeout(() => {
    container.innerHTML = '';
  }, 5000);
}

// ----------------------
// GESTIÓN DE PEDIDOS
// ----------------------

window.loadOrders = async function () {
  const status = document.getElementById('orderStatusFilter').value;
  const tbody = document.getElementById('ordersTableBody');

  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Cargando...</td></tr>';

  const query = `
    query GetOrders($status: String) {
      orders(status: $status) {
        id
        user {
          name
          email
        }
        total
        status
        createdAt
      }
    }
  `;

  try {
    const variables = status ? { status } : {};
    const data = await graphqlRequest(query, variables);
    displayOrders(data.orders);
  } catch (error) {
    console.error(error);
    showAlert('ordersAlert', 'Error al cargar pedidos', 'error');
  }
};

function displayOrders(orders) {
  const tbody = document.getElementById('ordersTableBody');

  if (!orders || orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No hay pedidos</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(order => `
    <tr>
      <td>${order.id}</td>
      <td>${escapeHtml(order.user ? (order.user.name || order.user.email) : 'Usuario eliminado')}</td>
      <td>${formatPriceEUR(order.total)}</td>
      <td>
        <span class="role-badge" style="background: ${order.status === 'completed' ? 'var(--color-success)' : '#f59e0b'}">
            ${order.status === 'completed' ? 'Completado' : 'Pendiente'}
        </span>
      </td>
      <td>${new Date(order.createdAt).toLocaleDateString()}</td>
      <td>
        ${order.status === 'pending' ? `
            <button class="btn-small" style="background: var(--color-success); color: white;" 
                    onclick="updateOrderStatus('${order.id}', 'completed')">
              Marcar Completado
            </button>
        ` : '—'}
      </td>
    </tr>
  `).join('');
}

window.updateOrderStatus = async function (orderId, status) {
  if (!confirm('¿Cambiar estado del pedido?')) return;

  const mutation = `
    mutation SetOrderStatus($orderId: ID!, $status: String!) {
      setOrderStatus(orderId: $orderId, status: $status) {
        id
        status
      }
    }
  `;

  try {
    await graphqlRequest(mutation, { orderId, status });
    loadOrders(); // Recargar lista
    showAlert('ordersAlert', 'Estado actualizado', 'success');
  } catch (error) {
    console.error(error);
    showAlert('ordersAlert', 'Error al actualizar estado', 'error');
  }
};
