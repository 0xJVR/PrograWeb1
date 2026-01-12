
// Estado
let cart = null;

// Helper de moneda (duplicado de client.js para simplicidad)
function formatPriceEUR(value) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Setup User Info
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.email) {
        document.getElementById('userName').textContent = user.name || user.email.split('@')[0];
        const userRoleEl = document.getElementById('userRole');
        userRoleEl.textContent = user.role;
        userRoleEl.className = `role-badge ${user.role || 'user'}`;
        document.getElementById('userAvatar').textContent = (user.name || user.email)[0].toUpperCase();
        // Background color
        const gradients = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)'
        ];
        document.getElementById('userAvatar').style.background = gradients[user.profileColor || 0];
        // Show logout button
        document.getElementById('logoutBtn').style.display = 'block';
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    });

    document.getElementById('checkoutBtn').addEventListener('click', checkout);

    await loadCart();
});

async function loadCart() {
    const query = `
        query MyCart {
            myCart {
                items {
                    product {
                        id
                        name
                        image
                        price
                    }
                    quantity
                    lineTotal
                }
                total
            }
        }
    `;

    try {
        const data = await graphqlRequest(query);
        cart = data.myCart;
        renderCart();
    } catch (error) {
        console.error(error);
        alert('Error al cargar el carrito');
    }
}

function renderCart() {
    const container = document.getElementById('cartItems');
    const summary = document.getElementById('cartSummary');
    const totalEl = document.getElementById('cartTotal');

    if (!cart || !cart.items || cart.items.length === 0) {
        container.innerHTML = '<div class="empty-cart"><h3>Tu carrito está vacío</h3><a href="/" class="btn btn-primary" style="margin-top:1rem;">Ver Productos</a></div>';
        summary.style.display = 'none';
        return;
    }

    summary.style.display = 'block';
    totalEl.textContent = formatPriceEUR(cart.total);

    container.innerHTML = cart.items.map(item => `
        <div class="cart-item">
            <img src="${item.product.image || 'https://via.placeholder.com/80?text=Prod'}" class="cart-item-image" alt="Producto">
            <div class="cart-item-details">
                <div class="cart-item-title">${item.product.name}</div>
                <div class="cart-item-price">${formatPriceEUR(item.product.price)} / ud.</div>
            </div>
            <div class="cart-item-actions">
                <input type="number" class="quantity-input" 
                       value="${item.quantity}" min="1" 
                       onchange="updateQuantity('${item.product.id}', this.value)">
                <button class="btn btn-danger" onclick="removeFromCart('${item.product.id}')">Eliminar</button>
            </div>
            <div style="font-weight: bold; margin-left: 1rem;">
                ${formatPriceEUR(item.lineTotal)}
            </div>
        </div>
    `).join('');
}

window.updateQuantity = async (productId, quantity) => {
    const qty = parseInt(quantity);
    if (qty < 1) return;

    const mutation = `
        mutation UpdateCartItem($productId: ID!, $quantity: Int!) {
            updateCartItem(productId: $productId, quantity: $quantity) {
                items {
                    product { id name image price }
                    quantity
                    lineTotal
                }
                total
            }
        }
    `;

    try {
        const data = await graphqlRequest(mutation, { productId, quantity: qty });
        cart = data.updateCartItem;
        renderCart();
    } catch (error) {
        console.error(error);
        alert('Error al actualizar cantidad');
    }
};

window.removeFromCart = async (productId) => {
    if (!confirm('¿Eliminar producto del carrito?')) return;

    const mutation = `
        mutation RemoveFromCart($productId: ID!) {
            removeFromCart(productId: $productId) {
                items {
                    product { id name image price }
                    quantity
                    lineTotal
                }
                total
            }
        }
    `;

    try {
        const data = await graphqlRequest(mutation, { productId });
        cart = data.removeFromCart;
        renderCart();
    } catch (error) {
        console.error(error);
        alert('Error al eliminar producto');
    }
};

async function checkout() {
    if (!confirm('¿Confirmar compra?')) return;

    const mutation = `
        mutation Checkout {
            checkout {
                id
                total
                status
            }
        }
    `;

    try {
        const data = await graphqlRequest(mutation);
        const order = data.checkout;

        document.getElementById('orderIdDisplay').textContent = `ID de Pedido: ${order.id}`;
        document.getElementById('orderSuccessModal').classList.add('show');

        // Limpiar vista
        cart = { items: [], total: 0 };
        renderCart();
    } catch (error) {
        console.error(error);
        alert('Error al procesar la compra: ' + error.message);
    }
}
