// Lógica del cliente para la página de detalle de producto

// Variables globales
let currentUser = null;
let currentProduct = null;
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

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', () => {
  checkAuthentication();
  loadProductFromURL();
  setupEventListeners();
});

// Verificar autenticación
async function checkAuthentication() {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');

  if (token && userData) {
    currentUser = JSON.parse(userData);

    // Completar profileColor si falta
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

  if (!currentUser || !currentUser.email) {
    console.error('Datos de usuario inválidos en localStorage');
    logout();
    return;
  }

  const displayName = currentUser.name || currentUser.email.split('@')[0];

  if (loginLink) loginLink.style.display = 'none';
  if (registerLink) registerLink.style.display = 'none';
  if (userInfo) userInfo.style.display = 'flex';
  if (userAvatar) {
    userAvatar.textContent = displayName.charAt(0).toUpperCase();
    userAvatar.style.background = GRADIENTS[currentUser.profileColor ?? 0];
  }
  if (userName) userName.textContent = displayName;
  if (userRole) {
    userRole.textContent = currentUser.role || 'user';
    userRole.className = `role-badge ${currentUser.role || 'user'}`;
  }
  if (logoutBtn) logoutBtn.style.display = 'block';
  if (chatLink) chatLink.style.display = 'block';
}

// Actualizar UI para usuario no autenticado
function updateUIForGuestUser() {
  const loginLink = document.getElementById('loginLink');
  const registerLink = document.getElementById('registerLink');
  const userInfo = document.getElementById('userInfo');
  const chatLink = document.getElementById('chatLink');

  if (loginLink) loginLink.style.display = 'block';
  if (registerLink) registerLink.style.display = 'block';
  if (userInfo) userInfo.style.display = 'none';
  if (chatLink) chatLink.style.display = 'none';
}

// Cerrar sesión
function logout() {
  if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    window.location.href = '/';
  }
}

// Obtener ID del producto desde la URL
function getProductIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

// Cargar producto desde la URL
async function loadProductFromURL() {
  const productId = getProductIdFromURL();
  
  if (!productId) {
    showError('ID de producto no especificado');
    return;
  }

  await loadProduct(productId);
}

// Cargar producto por ID
async function loadProduct(productId) {
  const loadingIndicator = document.getElementById('loadingIndicator');
  const productContent = document.getElementById('productContent');
  const errorMessage = document.getElementById('errorMessage');

  try {
    loadingIndicator.style.display = 'flex';
    productContent.style.display = 'none';
    errorMessage.style.display = 'none';

    const response = await fetch(`${API_URL}/products/${productId}`);
    const data = await response.json();

    if (data.success) {
      currentProduct = data.product;
      renderProduct(currentProduct);
      
      // Mostrar acciones de admin si es necesario
      if (currentUser && currentUser.role === 'admin') {
        document.getElementById('productActions').style.display = 'flex';
      }
      
      productContent.style.display = 'block';
    } else {
      showError(data.message || 'Producto no encontrado');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Error de conexión al cargar el producto');
  } finally {
    loadingIndicator.style.display = 'none';
  }
}

// Renderizar producto
function renderProduct(product) {
  const imageUrl = product.image;
  document.getElementById('productImage').src = imageUrl;
  document.getElementById('productImage').alt = product.name;
  document.getElementById('productName').textContent = product.name;
  document.getElementById('productPrice').textContent = `$${parseFloat(product.price).toFixed(2)}`;
  document.getElementById('productDescription').textContent = product.description;
  
  // Fechas del producto
  const createdAt = new Date(product.createdAt);
  document.getElementById('productCreatedAt').textContent = `Creado: ${createdAt.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`;
  
  if (product.updatedAt && product.updatedAt !== product.createdAt) {
    const updatedAt = new Date(product.updatedAt);
    const el = document.getElementById('productUpdatedAt');
    el.textContent = `Actualizado: ${updatedAt.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`;
    el.style.display = 'block';
  }
}

// Configurar event listeners
function setupEventListeners() {
  const backButton = document.getElementById('backButton');
  const logoutBtn = document.getElementById('logoutBtn');
  const editProductBtn = document.getElementById('editProductBtn');
  const deleteProductBtn = document.getElementById('deleteProductBtn');
  const closeModal = document.getElementById('closeModal');
  const cancelBtn = document.getElementById('cancelBtn');
  const productForm = document.getElementById('productForm');
  const modal = document.getElementById('productModal');

  if (backButton) {
    backButton.addEventListener('click', () => {
      window.location.href = '/';
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  if (editProductBtn) {
    editProductBtn.addEventListener('click', () => openEditProductModal());
  }

  if (deleteProductBtn) {
    deleteProductBtn.addEventListener('click', () => deleteProduct());
  }

  if (closeModal) {
    closeModal.addEventListener('click', closeProductModal);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeProductModal);
  }

  if (productForm) {
    productForm.addEventListener('submit', handleProductUpdate);
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeProductModal();
      }
    });
  }
}

// Abrir modal de edición de producto
function openEditProductModal() {
  if (!currentProduct) return;

  const modal = document.getElementById('productModal');
  const modalTitle = document.getElementById('modalTitle');
  const productId = document.getElementById('productId');
  const productName = document.getElementById('modalProductName');
  const productPrice = document.getElementById('modalProductPrice');
  const productDescription = document.getElementById('modalProductDescription');
  const productImage = document.getElementById('modalProductImage');

  modalTitle.textContent = 'Editar Producto';
  productId.value = currentProduct._id;
  productName.value = currentProduct.name;
  productPrice.value = currentProduct.price;
  productDescription.value = currentProduct.description;
  if (productImage) productImage.value = '';

  modal.classList.add('show');
  document.body.classList.add('modal-open');
}

// Cerrar modal de producto
function closeProductModal() {
  const modal = document.getElementById('productModal');
  const modalAlert = document.getElementById('modalAlert');
  
  modal.classList.remove('show');
  document.body.classList.remove('modal-open');
  modalAlert.innerHTML = '';
}

// Manejar actualización del producto
async function handleProductUpdate(e) {
  e.preventDefault();

  const modalAlert = document.getElementById('modalAlert');
  modalAlert.innerHTML = '';

  const token = localStorage.getItem('token');

  if (!token) {
    showModalError('Debes iniciar sesión para realizar esta acción');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/products/${currentProduct._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: document.getElementById('modalProductName').value,
        price: parseFloat(document.getElementById('modalProductPrice').value),
        description: document.getElementById('modalProductDescription').value
      })
    });

    const data = await response.json();

    if (data.success) {
      showModalSuccess(data.message);
      currentProduct = data.product;
      setTimeout(() => {
        closeProductModal();
        renderProduct(currentProduct);
      }, 1500);
    } else {
      showModalError(data.message || 'Error al actualizar producto');
    }
  } catch (error) {
    console.error('Error:', error);
    showModalError('Error de conexión');
  }
}

// Eliminar producto
async function deleteProduct() {
  if (!confirm('¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.')) {
    return;
  }

  const token = localStorage.getItem('token');

  if (!token) {
    alert('Debes iniciar sesión para realizar esta acción');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/products/${currentProduct._id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      showSuccess(data.message);
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
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
  const errorMessage = document.getElementById('errorMessage');
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
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
