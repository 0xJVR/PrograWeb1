// Lógica del cliente para la página principal de productos

// Variables globales
let currentUser = null;
let products = [];
let isEditMode = false;
let currentProductId = null;

// API Base URL
const API_URL = '/api';

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', () => {
  checkAuthentication();
  loadProducts();
  setupEventListeners();
});

// Verificar autenticación
function checkAuthentication() {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');

  if (token && userData) {
    currentUser = JSON.parse(userData);
    updateUIForAuthenticatedUser();
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
  if (userAvatar) userAvatar.textContent = displayName.charAt(0).toUpperCase();
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
        ¡Bienvenido, ${displayName}! (${welcomeRole})
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
    loadingIndicator.style.display = 'block';
    productsGrid.innerHTML = '';

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
    loadingIndicator.style.display = 'none';
  }
}

// Renderizar productos
function renderProducts(productsToRender) {
  const productsGrid = document.getElementById('productsGrid');

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
        src="${product.image || 'https://via.placeholder.com/400x300?text=Producto'}" 
        alt="${product.name}" 
        class="product-image"
        onclick="viewProductDetail('${product._id}')"
        style="cursor: pointer;"
      >
      <div class="product-info">
        <h3 class="product-name" onclick="viewProductDetail('${product._id}')">${product.name}</h3>
        <p class="product-price">$${parseFloat(product.price).toFixed(2)}</p>
        <p class="product-description">${product.description}</p>
        ${currentUser && currentUser.role === 'admin' ? `
          <div class="product-actions">
            <button class="btn btn-secondary" onclick="editProduct('${product._id}'); event.stopPropagation();">
              Editar
            </button>
            <button class="btn btn-danger" onclick="deleteProduct('${product._id}'); event.stopPropagation();">
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

  if (product) {
    // Modo edición
    isEditMode = true;
    currentProductId = product._id;
    modalTitle.textContent = 'Editar Producto';
    productId.value = product._id;
    productName.value = product.name;
    productPrice.value = product.price;
    productDescription.value = product.description;
    productImage.value = product.image || '';
  } else {
    // Modo creación
    isEditMode = false;
    currentProductId = null;
    modalTitle.textContent = 'Agregar Producto';
    productId.value = '';
    productName.value = '';
    productPrice.value = '';
    productDescription.value = '';
    productImage.value = '';
  }

  modal.classList.add('show');
}

// Cerrar modal de producto
function closeProductModal() {
  const modal = document.getElementById('productModal');
  const modalAlert = document.getElementById('modalAlert');
  modal.classList.remove('show');
  modalAlert.innerHTML = '';
}

// Manejar envío del formulario de producto
async function handleProductSubmit(e) {
  e.preventDefault();

  const modalAlert = document.getElementById('modalAlert');
  modalAlert.innerHTML = '';

  const productData = {
    name: document.getElementById('productName').value,
    price: parseFloat(document.getElementById('productPrice').value),
    description: document.getElementById('productDescription').value,
    image: document.getElementById('productImage').value || undefined
  };

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

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(productData)
    });

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
  modalAlert.innerHTML = `
    <div class="alert alert-error">
      ${message}
    </div>
  `;
}

// Mostrar éxito en modal
function showModalSuccess(message) {
  const modalAlert = document.getElementById('modalAlert');
  modalAlert.innerHTML = `
    <div class="alert alert-success">
      ${message}
    </div>
  `;
}

// Mostrar error general
function showError(message) {
  const container = document.querySelector('.container');
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
  const alert = document.createElement('div');
  alert.className = 'alert alert-success';
  alert.textContent = message;
  container.insertBefore(alert, container.firstChild);

  setTimeout(() => {
    alert.remove();
  }, 5000);
}
