const SUPABASE_URL = 'https://sliqaezclxbvlxwbqpjp.supabase.co'; // <-- ¡Pega tu URL aquí!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXFhZXpjbHhidmx4d2JxcGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTQwNzYsImV4cCI6MjA3MDg5MDA3Nn0.inNhc24bE0E6B9UOBnSBc0_sxsPrTX4JRaynET68Lsk'; // <-- ¡Pega tu clave anónima aquí!

const supabaseCliente = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Elementos del DOM ---
const productGrid = document.getElementById('product-grid');
const cartButton = document.getElementById('cart-button');
const cartModal = document.getElementById('cart-modal');
const closeCartButton = document.getElementById('close-cart-button');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalElement = document.getElementById('cart-total');
const cartCount = document.getElementById('cart-count');
const checkoutButton = document.getElementById('checkout-button');

// --- Estado del Carrito ---
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// --- Lógica Principal ---
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    updateCartUI();
    cartButton.addEventListener('click', () => cartModal.classList.add('show'));
    closeCartButton.addEventListener('click', () => cartModal.classList.remove('show'));
    checkoutButton.addEventListener('click', sendWhatsAppOrder);
});

// --- Cargar Productos ---
async function loadProducts() {
    if (!productGrid) return;
    productGrid.innerHTML = '<p>Cargando productos...</p>';
    const { data, error } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
    if (error) {
        productGrid.innerHTML = '<p>Error al cargar productos.</p>';
        return;
    }
    productGrid.innerHTML = data.map(product => `
        <a href="producto.html?id=${product.id}" class="product-card">
            <img src="${product.imagen_url}" alt="${product.nombre}">
            <div class="product-card-content">
                <h3>${product.nombre}</h3>
                <div class="price">$${product.precio}</div>
            </div>
        </a>
    `).join('');
}

// --- Lógica del Carrito ---
function updateCartUI() {
    updateCartCount();
    updateCartModal();
}

function updateCartCount() {
    cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartModal() {
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p>Tu carrito está vacío.</p>';
        cartTotalElement.innerHTML = '';
        return;
    }
    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <span class="cart-item-info">${item.quantity}x ${item.nombre}</span>
            <span>$${item.price * item.quantity}</span>
        </div>
    `).join('');
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cartTotalElement.textContent = `Total: $${total}`;
}

function sendWhatsAppOrder() {
    if (cart.length === 0) {
        alert("Tu carrito está vacío.");
        return;
    }
    const phoneNumber = "59892190483"; // Número de WhatsApp de destino
    let message = "¡Hola Emprendedoras de Acero! ✨\nQuisiera hacer el siguiente pedido:\n\n";
    cart.forEach(item => {
        message += `*${item.quantity}x* - ${item.nombre} ($${item.price})\n`;
    });
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    message += `\n*Total del pedido: $${total}*`;
    
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    // Limpiar carrito y redirigir
    cart = [];
    localStorage.removeItem('cart');
    updateCartUI();
    window.open(whatsappUrl, '_blank');
}