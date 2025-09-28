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
                <div class="product-detail__gallery">
                    <div class="product-detail__main-image">
                        <img src="${currentProduct.imagen_url}" alt="${currentProduct.nombre}">
                    </div>
                    <div class="product-detail__features">
                        <div class="feature">
                            <i class="fas fa-medal"></i>
                            <span>Calidad Premium</span>
                        </div>
                        <div class="feature">
                            <i class="fas fa-truck"></i>
                            <span>Envío Seguro</span>
                        </div>
                        <div class="feature">
                            <i class="fas fa-shield-alt"></i>
                            <span>Garantía</span>
                        </div>
                    </div>
                </div>
                <div class="product-detail__info">
                    <div class="product-detail__header">
                        <span class="category">${currentProduct.categoria}</span>
                        <h1>${currentProduct.nombre}</h1>
                    </div>
                    <div class="product-detail__price-box">
                        <div class="price">$${currentProduct.precio.toFixed(2)}</div>
                        <div class="stock">En Stock</div>
                    </div>
                    <div class="product-detail__description">
                        <h3>Descripción del Producto</h3>
                        <p>${currentProduct.descripcion}</p>
                    </div>
                    <div class="product-detail__actions">
                        <div class="quantity-selector">
                            <button class="quantity-btn minus"><i class="fas fa-minus"></i></button>
                            <input type="number" id="quantity-input" value="1" min="1" max="10">
                            <button class="quantity-btn plus"><i class="fas fa-plus"></i></button>
                        </div>
                        <button id="add-to-cart-btn" class="btn btn--primary">
                            <i class="fas fa-shopping-cart"></i>
                            Añadir al Carrito
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Configurar controles de cantidad
        const quantityInput = document.getElementById('quantity-input');
        const minusBtn = document.querySelector('.quantity-btn.minus');
        const plusBtn = document.querySelector('.quantity-btn.plus');

        minusBtn.addEventListener('click', () => {
            const currentValue = parseInt(quantityInput.value);
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
            }
        });

        plusBtn.addEventListener('click', () => {
            const currentValue = parseInt(quantityInput.value);
            if (currentValue < 10) {
                quantityInput.value = currentValue + 1;
            }
        });

        // Cargar productos relacionados
        loadRelatedProducts(currentProduct.categoria);

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

    function calculateDiscounts(subtotal) {
        let discount = 0;
        let discountMessage = '';

        // Descuento por compra mayorista
        if (subtotal >= 2000) {
            discount = subtotal * 0.15; // 15% de descuento
            discountMessage = 'Descuento mayorista (15%)';
        }

        return {
            subtotal,
            discount,
            total: subtotal - discount,
            discountMessage
        };
    }

    function updateCartTotal() {
        const subtotal = cart.reduce((sum, item) => sum + item.precio * item.quantity, 0);
        const { total, discount, discountMessage } = calculateDiscounts(subtotal);

        // Actualizar el HTML del total del carrito
        const cartTotalContainer = document.querySelector('.cart-modal__footer');
        cartTotalContainer.innerHTML = `
            <div class="cart-modal__summary">
                <div class="summary-line">
                    <span>Subtotal:</span>
                    <span>$${subtotal.toFixed(2)}</span>
                </div>
                ${discount > 0 ? `
                <div class="summary-line discount">
                    <span>${discountMessage}:</span>
                    <span>-$${discount.toFixed(2)}</span>
                </div>` : ''}
                <div class="summary-line total">
                    <span>Total:</span>
                    <span>$${total.toFixed(2)}</span>
                </div>
            </div>
            <button id="checkout-btn" class="btn btn--primary">Finalizar Compra</button>
            <button id="clear-cart-btn" class="btn btn--secondary">Vaciar Carrito</button>
        `;

        // Reattach event listeners
        document.getElementById('checkout-btn').addEventListener('click', checkout);
        document.getElementById('clear-cart-btn').addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
                cart = [];
                updateCart();
            }
        });
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

    async function checkout() {
        if (cart.length === 0) {
            alert("Tu carrito está vacío.");
            return;
        }

        let message = "¡Hola! Quisiera hacer el siguiente pedido:\n\n";
        
        // Agregamos cada producto con su información
        cart.forEach(item => {
            message += `🔹 *${item.nombre}*\n`;
            message += `   • Cantidad: ${item.quantity}\n`;
            message += `   • Precio unitario: $${item.precio.toFixed(2)}\n`;
            message += `   • Subtotal: $${(item.precio * item.quantity).toFixed(2)}\n`;
            message += `   • Ver producto: ${item.imagen_url}\n\n`;
        });

        const total = cart.reduce((sum, item) => sum + item.precio * item.quantity, 0);
        message += `\n💰 *TOTAL: $${total.toFixed(2)}*\n\n`;
        message += `📸 Las imágenes de los productos están en los enlaces de arriba.`;

        const whatsappUrl = `https://wa.me/59892190483?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');

        // Opcionalmente, limpiar el carrito después de enviar el pedido
        if (confirm('Pedido enviado. ¿Deseas vaciar el carrito?')) {
            cart = [];
            updateCart();
            cartModal.classList.remove('open');
        }
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

    // --- Cargar Productos Relacionados ---
    async function loadRelatedProducts(categoria) {
        const { data: relatedProducts, error } = await supabase
            .from('productos')
            .select('*')
            .eq('categoria', categoria)
            .neq('id', currentProduct.id)
            .limit(4);

        if (error) {
            console.error('Error al cargar productos relacionados:', error);
            return;
        }

        const relatedProductsContainer = document.getElementById('related-products-grid');
        relatedProductsContainer.innerHTML = relatedProducts.map(product => `
            <div class="product-card" onclick="window.location.href='producto.html?id=${product.id}'">
                <img src="${product.imagen_url}" alt="${product.nombre}" class="product-card__image">
                <div class="product-card__content">
                    <span class="product-card__category">${product.categoria}</span>
                    <h3 class="product-card__title">${product.nombre}</h3>
                    <div class="product-card__price">$${product.precio.toFixed(2)}</div>
                </div>
            </div>
        `).join('');
    }

    // --- Inicialización ---
    loadProduct();
    updateCart();
});
