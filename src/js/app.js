document.addEventListener('DOMContentLoaded', () => {
    // --- Configuración de Supabase ---
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
    
    // --- Elementos de Filtros ---
    const searchInput = document.getElementById('search-input');
    const categoryFiltersContainer = document.getElementById('category-filters');
    const minPriceInput = document.getElementById('min-price');
    const maxPriceInput = document.getElementById('max-price');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const noResultsMessage = document.getElementById('no-results-message');

    // --- Estado de la Aplicación ---
    let allProducts = [];
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    // --- Lógica Principal ---
    async function init() {
        await loadProducts();
        setupEventListeners();
        updateCart();
        setupMobileMenu();
    }

    // --- Carga de Productos ---
    async function loadProducts() {
        const { data, error } = await supabase.from('productos').select('*').order('created_at', { ascending: false });

        if (error) {
            console.error('Error al cargar productos:', error);
            productGrid.innerHTML = '<p>No se pudieron cargar los productos. Intenta de nuevo más tarde.</p>';
            return;
        }

        allProducts = data;
        populateCategoryFilters();
        renderProducts(allProducts);
    }
    
    function renderProducts(products) {
        productGrid.innerHTML = ''; // Limpiar la grilla antes de renderizar
        if (products.length === 0) {
            noResultsMessage.style.display = 'block';
        } else {
            noResultsMessage.style.display = 'none';
        }
        
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.dataset.productId = product.id; // Guardamos el ID para fácil acceso
            
            card.innerHTML = `
                <img src="${product.imagen_url}" alt="${product.nombre}" class="product-card__image">
                <div class="product-card__content">
                    <span class="product-card__category">${product.categoria}</span>
                    <h3 class="product-card__title">${product.nombre}</h3>
                    <p class="product-card__price">$${product.precio.toFixed(2)}</p>
                </div>
            `;
            // Event listener para redirigir a la página del producto
            card.addEventListener('click', () => {
                window.location.href = `producto.html?id=${product.id}`;
            });
            
            productGrid.appendChild(card);
        });
    }

    // --- Lógica de Filtros ---
    function populateCategoryFilters() {
        const categories = [...new Set(allProducts.map(p => p.categoria))];
        categoryFiltersContainer.innerHTML = '<button class="category-btn active" data-category="all">Todos</button>';
        categories.forEach(category => {
            categoryFiltersContainer.innerHTML += `<button class="category-btn" data-category="${category}">${category}</button>`;
        });
    }

    function applyFilters() {
        let filteredProducts = [...allProducts];
        
        // 1. Filtro de Búsqueda (nombre)
        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            filteredProducts = filteredProducts.filter(p => p.nombre.toLowerCase().includes(searchTerm));
        }

        // 2. Filtro de Categoría
        const activeCategory = document.querySelector('.category-btn.active').dataset.category;
        if (activeCategory !== 'all') {
            filteredProducts = filteredProducts.filter(p => p.categoria === activeCategory);
        }

        // 3. Filtro de Precio
        const minPrice = parseFloat(minPriceInput.value);
        const maxPrice = parseFloat(maxPriceInput.value);
        if (!isNaN(minPrice)) {
            filteredProducts = filteredProducts.filter(p => p.precio >= minPrice);
        }
        if (!isNaN(maxPrice) && maxPrice > 0) {
            filteredProducts = filteredProducts.filter(p => p.precio <= maxPrice);
        }
        
        renderProducts(filteredProducts);
    }
    
    function setupEventListeners() {
        // Event Listeners para Filtros
        searchInput.addEventListener('input', applyFilters);
        minPriceInput.addEventListener('input', applyFilters);
        maxPriceInput.addEventListener('input', applyFilters);

        categoryFiltersContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-btn')) {
                document.querySelector('.category-btn.active').classList.remove('active');
                e.target.classList.add('active');
                applyFilters();
            }
        });
        
        clearFiltersBtn.addEventListener('click', () => {
            searchInput.value = '';
            minPriceInput.value = '';
            maxPriceInput.value = '';
            document.querySelector('.category-btn.active').classList.remove('active');
            document.querySelector('.category-btn[data-category="all"]').classList.add('active');
            renderProducts(allProducts);
        });

        // Event Listeners del Carrito
        cartToggle.addEventListener('click', () => cartModal.classList.add('open'));
        closeCartBtn.addEventListener('click', () => cartModal.classList.remove('open'));
        window.addEventListener('click', e => {
            if (e.target === cartModal) cartModal.classList.remove('open');
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
    
    function handleCartInteraction(e) {
        const target = e.target;
        const cartItem = target.closest('.cart-item');
        if (!cartItem) return;

        const id = parseInt(cartItem.dataset.id);

        // Eliminar item
        if (target.closest('.cart-item__remove')) {
            cart = cart.filter(item => item.id !== id);
        }

        // Actualizar cantidad
        if (target.classList.contains('cart-item__quantity-input')) {
            const newQuantity = parseInt(target.value);
            const itemInCart = cart.find(item => item.id === id);
            if (itemInCart && newQuantity > 0) {
                itemInCart.quantity = newQuantity;
            } else { // Si la cantidad es 0 o inválida, se elimina
                cart = cart.filter(item => item.id !== id);
            }
        }
        
        updateCart();
    }

    function updateCartCount() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }

    function updateCartTotal() {
        const total = cart.reduce((sum, item) => sum + item.precio * item.quantity, 0);
        cartTotal.textContent = total.toFixed(2);
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

    // --- Lógica del Menú Móvil ---
    function setupMobileMenu() {
        if(navToggle) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.add('show-menu');
            });
        }
        if(navClose) {
            navClose.addEventListener('click', () => {
                navMenu.classList.remove('show-menu');
            });
        }
    }

    // --- Inicialización ---
    init();
});