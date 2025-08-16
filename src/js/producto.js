document.addEventListener('DOMContentLoaded', () => {
    const SUPABASE_URL = 'https://sliqaezclxbvlxwbqpjp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXFhZXpjbHhidmx4d2JxcGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTQwNzYsImV4cCI6MjA3MDg5MDA3Nn0.inNhc24bE0E6B9UOBnSBc0_sxsPrTX4JRaynET68Lsk';
    const supabase = self.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const productDetailContainer = document.getElementById('product-detail-main');
    const cartCount = document.getElementById('cart-count');
    const cartModal = document.getElementById('cart-modal');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const cartToggle = document.getElementById('cart-toggle');
    const closeCartBtn = document.getElementById('close-cart');
    const checkoutBtn = document.getElementById('checkout-btn');
    const clearCartBtn = document.getElementById('clear-cart-btn');

    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let currentProduct = null;

    // --- Cargar Producto Específico ---
    async function loadProduct() {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        if (!productId) {
            productDetailContainer.innerHTML = '<p>Producto no encontrado.</p>';
            return;
        }

        const { data, error } = await supabase
            .from('productos')
            .select('*')
            .eq('id', productId)
            .single();

        if (error || !data) {
            console.error('Error al cargar el producto:', error);
            productDetailContainer.innerHTML = '<p>Error al cargar el producto.</p>';
            return;
        }
        
        currentProduct = data;
        document.title = `${currentProduct.nombre} - Emprendedoras de Acero`;

        productDetailContainer.innerHTML = `
            <div class="product-detail">
                <div class="product-detail__image">
                    <img src="${currentProduct.imagen_url}" alt="${currentProduct.nombre}">
                </div>
                <div class="product-detail__info">
                    <span class="category">${currentProduct.categoria}</span>
                    <h1>${currentProduct.nombre}</h1>
                    <p class="description">${currentProduct.descripcion}</p>
                    <div class="price">$${currentProduct.precio.toFixed(2)}</div>
                    <button id="add-to-cart-btn" class="btn">Añadir al Carrito</button>
                </div>
            </div>
        `;

        document.getElementById('add-to-cart-btn').addEventListener('click', () => {
            if(currentProduct) {
                addToCart(currentProduct);
                cartModal.classList.add('open'); // Abrir carrito al añadir
            }
        });
    }

    // --- Lógica del Carrito (Reutilizada) ---
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

    function addToCart(product, quantity = 1) {
        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({ ...product, quantity });
        }
        updateCart();
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
    window.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            cartModal.classList.remove('open');
        }
    });
    
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
    loadProduct();
    updateCart();
});
