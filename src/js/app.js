document.addEventListener('DOMContentLoaded', () => {
    const SUPABASE_URL = 'https://sliqaezclxbvlxwbqpjp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXFhZXpjbHhidmx4d2JxcGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTQwNzYsImV4cCI6MjA3MDg5MDA3Nn0.inNhc24bE0E6B9UOBnSBc0_sxsPrTX4JRaynET68Lsk';
    const supabase = self.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- Elementos del DOM ---
    const productGrid = document.getElementById('product-grid');
    const cartCount = document.getElementById('cart-count');
    const cartModal = document.getElementById('cart-modal');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const cartToggle = document.getElementById('cart-toggle');
    const closeCartBtn = document.getElementById('close-cart');
    const checkoutBtn = document.getElementById('checkout-btn');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    const navMenu = document.getElementById('nav-menu');
    const navToggle = document.getElementById('nav-toggle');
    const navClose = document.getElementById('nav-close');

    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    // --- Menú Responsive ---
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.add('show-menu');
        });
    }
    if (navClose) {
        navClose.addEventListener('click', () => {
            navMenu.classList.remove('show-menu');
        });
    }

    // --- Cargar Productos ---
    async function loadProducts() {
        if (!productGrid) return;
        
        const { data, error } = await supabase
            .from('productos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error al cargar productos:', error);
            productGrid.innerHTML = '<p>Error al cargar los productos.</p>';
            return;
        }

        if (data.length === 0) {
            productGrid.innerHTML = '<p>No hay productos disponibles en este momento.</p>';
            return;
        }

        productGrid.innerHTML = data.map(product => `
            <div class="product-card" data-id="${product.id}">
                <img src="${product.imagen_url}" alt="${product.nombre}" class="product-card__image">
                <div class="product-card__content">
                    <span class="product-card__category">${product.categoria}</span>
                    <h3 class="product-card__title">${product.nombre}</h3>
                    <div class="product-card__price">$${product.precio.toFixed(2)}</div>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', () => {
                const productId = card.dataset.id;
                window.location.href = `producto.html?id=${productId}`;
            });
        });
    }

    // --- Lógica del Carrito ---
    function updateCart() {
        renderCartItems();
        updateCartCount();
        updateCartTotal();
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    function renderCartItems() {
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="cart-modal__empty-msg">Tu carrito está vacío.</p>';
        } else {
            cartItemsContainer.innerHTML = cart.map(item => `
                <div class="cart-item" data-id="${item.id}">
                    <img src="${item.imagen_url}" alt="${item.nombre}" class="cart-item__image">
                    <div class="cart-item__info">
                        <h4 class="cart-item__title">${item.nombre}</h4>
                        <span class="cart-item__price">$${item.precio.toFixed(2)}</span>
                        <div class="cart-item__quantity">
                            <input type="number" min="1" value="${item.quantity}" class="cart-item__quantity-input">
                        </div>
                    </div>
                    <button class="cart-item__remove"><i class="fas fa-trash-alt"></i></button>
                </div>
            `).join('');
        }
    }

    function updateCartCount() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }

    function updateCartTotal() {
        const total = cart.reduce((sum, item) => sum + item.precio * item.quantity, 0);
        cartTotal.textContent = total.toFixed(2);
    }

    function handleCartInteraction(e) {
        const target = e.target;
        const cartItem = target.closest('.cart-item');
        if (!cartItem) return;

        const id = parseInt(cartItem.dataset.id);

        if (target.closest('.cart-item__remove')) {
            cart = cart.filter(item => item.id !== id);
        }

        if (target.classList.contains('cart-item__quantity-input')) {
            const newQuantity = parseInt(target.value);
            const itemInCart = cart.find(item => item.id === id);
            if (itemInCart && newQuantity > 0) {
                itemInCart.quantity = newQuantity;
            } else {
                cart = cart.filter(item => item.id !== id);
            }
        }
        
        updateCart();
    }

    // --- Finalizar Compra ---
    function checkout() {
        if (cart.length === 0) {
            alert("Tu carrito está vacío.");
            return;
        }

        let message = "¡Hola! Quisiera hacer el siguiente pedido:\n\n";
        cart.forEach(item => {
            message += `${item.quantity}x ${item.nombre} - $${(item.precio * item.quantity).toFixed(2)}\n`;
        });
        const total = cart.reduce((sum, item) => sum + item.precio * item.quantity, 0);
        message += `\n*Total: $${total.toFixed(2)}*`;

        const whatsappUrl = `https://wa.me/59892190483?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }
    
    // --- Event Listeners ---
    cartToggle.addEventListener('click', () => cartModal.classList.add('open'));
    closeCartBtn.addEventListener('click', () => cartModal.classList.remove('open'));
    
    cartItemsContainer.addEventListener('change', handleCartInteraction);
    cartItemsContainer.addEventListener('click', handleCartInteraction);
    
    checkoutBtn.addEventListener('click', checkout);
    
    clearCartBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
            cart = [];
            updateCart();
        }
    });

    // --- Inicialización ---
    loadProducts();
    updateCart();
});
