// Lógica del cliente para la página principal de productos

// Variables globales
let currentUser = null;
let products = [];
let isEditMode = false;
let currentProductId = null;

// API Base URL
const API_URL = '/api';

// Gradientes para avatar
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

// Helper anti-XSS para HTML
function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = String(s ?? '');
  return d.innerHTML;
}

// Inicializar aplicación (aseguramos auth antes de productos)
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await checkAuthentication();
  } catch {}
  await loadProducts();
  setupEventListeners();
});

// Verificar autenticación
async function checkAuthentication() {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');

  if (token && userData) {
    currentUser = JSON.parse(userData);

    // Si no tenemos profileColor, completar desde /api/users/profile
    if (currentUser.profileColor === undefined || currentUser.profileColor === null) {
      try {
        const res = await fetch('/api/users/profile', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          currentUser.profileColor = data.user.profileColor;
          localStorage.setItem('user', JSON.stringify(currentUser));
        }
      } catch {}
    }

    updateUIForAuthenticatedUser();
    // Si ya hubiéramos cargado productos, re-render para mostrar acciones de admin
    if (products.length) renderProducts(products);
  } else {
    updateUIForGuestUser();
  }
}

// Actualizar UI para usuario autenticado
function updateUIForAuthenticatedUser() {
  const loginLink = document.getElementById('loginLink');
  const registerLink = document.getElementById('registerLink');
  const userInfo = document.getElementById('userInfo');
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  const userRole = document.getElementById('userRole');
  const logoutBtn = document.getElementById('logoutBtn');
  const chatLink = document.getElementById('chatLink');
  const addProductBtn = document.getElementById('addProductBtn');
  const welcomeMessage = document.getElementById('welcomeMessage');

  // Verificar que tengamos datos del usuario válidos
  if (!currentUser || !currentUser.email) {
    console.error('Datos de usuario inválidos en localStorage');
    logout();
    return;
  }

  // Usar name si existe, si no usar email como fallback
  const displayName = currentUser.name || currentUser.email.split('@')[0];

  // Ocultar links de login/registro
  if (loginLink) loginLink.style.display = 'none';
  if (registerLink) registerLink.style.display = 'none';

  // Mostrar información del usuario
  if (userInfo) userInfo.style.display = 'flex';
  if (userAvatar) {
    userAvatar.textContent = displayName.charAt(0).toUpperCase();
    const idx = currentUser.profileColor ?? 0;
    userAvatar.style.background = GRADIENTS[idx];
  }
  if (userName) userName.textContent = displayName;
  if (userRole) {
    userRole.textContent = currentUser.role || 'user';
    userRole.className = `role-badge ${currentUser.role || 'user'}`;
  }

  // Mostrar botón de logout
  if (logoutBtn) logoutBtn.style.display = 'block';

  // Mostrar link de chat
  if (chatLink) chatLink.style.display = 'block';

  // Mostrar botón de agregar producto si es admin
  if (currentUser.role === 'admin' && addProductBtn) {
    addProductBtn.style.display = 'block';
  }

  // Mensaje de bienvenida
  if (welcomeMessage) {
    const welcomeRole = currentUser.role === 'admin' ? 'Administrador' : 'Usuario';
    welcomeMessage.innerHTML = `
      <div class="alert alert-success" style="animation: fadeIn 0.6s ease;">
        ¡Bienvenido, ${escapeHtml(displayName)}! (${welcomeRole})
      </div>
    `;
    welcomeMessage.style.display = 'block';
    
    // Ocultar mensaje después de 3 segundos
    setTimeout(() => {
      welcomeMessage.style.display = 'none';
    }, 3000);
  }
}

// Actualizar UI para usuario no autenticado
function updateUIForGuestUser() {
  const loginLink = document.getElementById('loginLink');
  const registerLink = document.getElementById('registerLink');
  const userInfo = document.getElementById('userInfo');
  const chatLink = document.getElementById('chatLink');
  const addProductBtn = document.getElementById('addProductBtn');

  if (loginLink) loginLink.style.display = 'block';
  if (registerLink) registerLink.style.display = 'block';
  if (userInfo) userInfo.style.display = 'none';
  if (chatLink) chatLink.style.display = 'none';
  if (addProductBtn) addProductBtn.style.display = 'none';
}

// Configurar event listeners
function setupEventListeners() {
  const logoutBtn = document.getElementById('logoutBtn');
  const addProductBtn = document.getElementById('addProductBtn');
  const closeModal = document.getElementById('closeModal');
  const cancelBtn = document.getElementById('cancelBtn');
  const productForm = document.getElementById('productForm');
  const productsGrid = document.getElementById('productsGrid');
  const productImageInput = document.getElementById('productImage');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  if (addProductBtn) {
    addProductBtn.addEventListener('click', () => openProductModal());
  }

  if (closeModal) {
    closeModal.addEventListener('click', closeProductModal);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeProductModal);
  }

  if (productForm) {
    productForm.addEventListener('submit', handleProductSubmit);
  }

  // Delegación de eventos para acciones de producto (sin inline JS)
  if (productsGrid) {
    productsGrid.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit');
      if (editBtn) {
        e.preventDefault();
        e.stopPropagation();
        const productId = editBtn.dataset.id;
        editProduct(productId);
        return;
      }
      const deleteBtn = e.target.closest('.btn-delete');
      if (deleteBtn) {
        e.preventDefault();
        e.stopPropagation();
        const productId = deleteBtn.dataset.id;
        deleteProduct(productId);
        return;
      }
      const cardImg = e.target.closest('[data-view-id]');
      if (cardImg) {
        viewProductDetail(cardImg.dataset.viewId);
      }
    });
  }

  // Vista previa de imagen (opcional)
  if (productImageInput) {
    productImageInput.addEventListener('change', () => {
      const file = productImageInput.files && productImageInput.files[0];
      const previewWrap = document.getElementById('imagePreview');
      const previewImg = document.getElementById('previewImage');
      if (!file || !previewWrap || !previewImg) return;
      const reader = new FileReader();
      reader.onload = () => {
        previewImg.src = reader.result;
        previewWrap.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });
  }

  // Cerrar modal al hacer clic fuera
  const modal = document.getElementById('productModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeProductModal();
      }
    });
  }
}

// Cerrar sesión
function logout() {
  if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    window.location.reload();
  }
}

// Cargar productos
async function loadProducts() {
  const productsGrid = document.getElementById('productsGrid');
  const loadingIndicator = document.getElementById('loadingIndicator');

  try {
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (productsGrid) productsGrid.innerHTML = '';

    const response = await fetch(`${API_URL}/products`);
    const data = await response.json();

    if (data.success) {
      products = data.products;
      renderProducts(products);
    } else {
      showError('Error al cargar productos');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Error de conexión al cargar productos');
  } finally {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
  }
}

// Renderizar productos (con escape anti-XSS) y SIN inline JS
function renderProducts(productsToRender) {
  const productsGrid = document.getElementById('productsGrid');

  if (!productsGrid) return;

  if (productsToRender.length === 0) {
    productsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--color-text-muted);">
        <h3>No hay productos disponibles</h3>
        <p>Los productos aparecerán aquí cuando se agreguen.</p>
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = productsToRender.map(product => `
    <div class="product-card">
      <img 
        src="${escapeHtml(product.image || 'https://via.placeholder.com/400x300?text=Producto')}" 
        alt="${escapeHtml(product.name)}" 
        class="product-image"
        data-view-id="${product._id}"
        style="cursor: pointer;"
      >
      <div class="product-info">
        <h3 class="product-name" data-view-id="${product._id}" style="cursor:pointer;">${escapeHtml(product.name)}</h3>
        <p class="product-price">$${parseFloat(product.price).toFixed(2)}</p>
        <p class="product-description">${escapeHtml(product.description)}</p>
        ${currentUser && currentUser.role === 'admin' ? `
          <div class="product-actions">
            <button class="btn btn-secondary btn-edit" data-id="${product._id}">
              Editar
            </button>
            <button class="btn btn-danger btn-delete" data-id="${product._id}">
              Eliminar
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// Ver producto en detalle
function viewProductDetail(productId) {
  window.location.href = `/product-detail.html?id=${productId}`;
}

// Abrir modal de producto
function openProductModal(product = null) {
  const modal = document.getElementById('productModal');
  const modalTitle = document.getElementById('modalTitle');
  const productId = document.getElementById('productId');
  const productName = document.getElementById('productName');
  const productPrice = document.getElementById('productPrice');
  const productDescription = document.getElementById('productDescription');
  const productImage = document.getElementById('productImage');
  const imagePreview = document.getElementById('imagePreview');

  if (product) {
    // Modo edición
    isEditMode = true;
    currentProductId = product._id;
    modalTitle.textContent = 'Editar Producto';
    productId.value = product._id;
    productName.value = product.name;
    productPrice.value = product.price;
    productDescription.value = product.description;
    if (productImage) productImage.value = '';
    if (imagePreview) imagePreview.style.display = 'none';
  } else {
    // Modo creación
    isEditMode = false;
    currentProductId = null;
    modalTitle.textContent = 'Agregar Producto';
    productId.value = '';
    productName.value = '';
    productPrice.value = '';
    productDescription.value = '';
    if (productImage) productImage.value = '';
    if (imagePreview) imagePreview.style.display = 'none';
  }

  modal.classList.add('show');
}

// Cerrar modal de producto
function closeProductModal() {
  const modal = document.getElementById('productModal');
  const modalAlert = document.getElementById('modalAlert');
  modal.classList.remove('show');
  if (modalAlert) modalAlert.innerHTML = '';
}

// Manejar envío del formulario de producto
async function handleProductSubmit(e) {
  e.preventDefault();

  const modalAlert = document.getElementById('modalAlert');
  if (modalAlert) modalAlert.innerHTML = '';

  const token = localStorage.getItem('token');

  if (!token) {
    showModalError('Debes iniciar sesión para realizar esta acción');
    return;
  }

  try {
    const url = isEditMode 
      ? `${API_URL}/products/${currentProductId}` 
      : `${API_URL}/products`;
    
    const method = isEditMode ? 'PUT' : 'POST';

    let response;
    if (method === 'POST') {
      // Crear con posible imagen (FormData)
      const formEl = document.getElementById('productForm');
      const fd = new FormData(formEl);
      response = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      });
    } else {
      // Editar sin cambio de imagen (JSON simple)
      const productData = {
        name: document.getElementById('productName').value,
        price: parseFloat(document.getElementById('productPrice').value),
        description: document.getElementById('productDescription').value
      };
      response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });
    }

    const data = await response.json();

    if (data.success) {
      showModalSuccess(data.message);
      setTimeout(() => {
        closeProductModal();
        loadProducts();
      }, 1500);
    } else {
      showModalError(data.message || 'Error al guardar producto');
    }
  } catch (error) {
    console.error('Error:', error);
    showModalError('Error de conexión');
  }
}

// Editar producto
async function editProduct(productId) {
  const product = products.find(p => p._id === productId);
  if (product) {
    openProductModal(product);
  }
}

// Eliminar producto
async function deleteProduct(productId) {
  if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) {
    return;
  }

  const token = localStorage.getItem('token');

  if (!token) {
    alert('Debes iniciar sesión para realizar esta acción');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      showSuccess(data.message);
      loadProducts();
    } else {
      showError(data.message || 'Error al eliminar producto');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Error de conexión');
  }
}

// Mostrar error en modal
function showModalError(message) {
  const modalAlert = document.getElementById('modalAlert');
  if (!modalAlert) return;
  modalAlert.innerHTML = `
    <div class="alert alert-error">
      ${escapeHtml(message)}
    </div>
  `;
}

// Mostrar éxito en modal
function showModalSuccess(message) {
  const modalAlert = document.getElementById('modalAlert');
  if (!modalAlert) return;
  modalAlert.innerHTML = `
    <div class="alert alert-success">
      ${escapeHtml(message)}
    </div>
  `;
}

// Mostrar error general
function showError(message) {
  const container = document.querySelector('.container');
  if (!container) return;
  const alert = document.createElement('div');
  alert.className = 'alert alert-error';
  alert.textContent = message;
  container.insertBefore(alert, container.firstChild);

  setTimeout(() => {
    alert.remove();
  }, 5000);
}

// Mostrar éxito general
function showSuccess(message) {
  const container = document.querySelector('.container');
  if (!container) return;
  const alert = document.createElement('div');
  alert.className = 'alert alert-success';
  alert.textContent = message;
  container.insertBefore(alert, container.firstChild);

  setTimeout(() => {
    alert.remove();
  }, 5000);
}
