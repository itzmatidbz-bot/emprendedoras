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
    
    // NUEVOS ELEMENTOS DEL DOM
    const categoryFiltersContainer = document.getElementById('category-filters');
    const searchInput = document.getElementById('search-input');
    const minPriceInput = document.getElementById('min-price');
    const maxPriceInput = document.getElementById('max-price');
    const filterPriceBtn = document.getElementById('filter-price-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let allProducts = []; // Almacenará todos los productos sin filtrar

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
    
    // --- Lógica de Filtros (NUEVO) ---
    function filterProducts() {
        if (!productGrid) return;
        
        const selectedCategory = document.querySelector('.filter-option.active')?.dataset.category;
        const searchTerm = searchInput.value.toLowerCase();
        const minPrice = parseFloat(minPriceInput.value) || 0;
        const maxPrice = parseFloat(maxPriceInput.value) || Infinity;
        
        const filteredProducts = allProducts.filter(product => {
            const matchesCategory = selectedCategory === 'all' || !selectedCategory ? true : product.categoria === selectedCategory;
            const matchesSearch = product.nombre.toLowerCase().includes(searchTerm) || product.descripcion.toLowerCase().includes(searchTerm);
            const matchesPrice = product.precio >= minPrice && product.precio <= maxPrice;
            
            return matchesCategory && matchesSearch && matchesPrice;
        });
        
        renderProducts(filteredProducts);
    }
    
    // --- Renderizar productos en el grid ---
    function renderProducts(products) {
        if (!productGrid) return;

        if (products.length === 0) {
            productGrid.innerHTML = '<p>No hay productos que coincidan con los filtros.</p>';
            return;
        }

        productGrid.innerHTML = products.map(product => `
            <div class="product-card" data-id="${product.id}">
                <a href="producto.html?id=${product.id}">
                    <img src="${product.imagen_url}" alt="${product.nombre}" class="product-card__image">
                </a>
                <div class="product-card__content">
                    <span class="product-card__category">${product.categoria}</span>
                    <h3 class="product-card__name"><a href="producto.html?id=${product.id}">${product.nombre}</a></h3>
                    <div class="product-card__price">$${product.precio.toFixed(2)}</div>
                    <button class="btn btn--add-to-cart" data-id="${product.id}">Añadir al carrito</button>
                </div>
            </div>
        `).join('');

        // Añadir event listeners a los nuevos botones
        document.querySelectorAll('.btn--add-to-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.target.dataset.id;
                const productToAdd = allProducts.find(p => p.id == productId);
                if (productToAdd) {
                    addToCart(productToAdd);
                    cartModal.classList.add('open');
                }
            });
        });
    }

    // --- Cargar Categorías (MODIFICADO) ---
    async function loadCategories() {
        const { data, error } = await supabase
            .from('productos')
            .select('categoria')
            .order('categoria', { ascending: true });

        if (error) {
            console.error('Error al cargar categorías:', error);
            return;
        }

        const uniqueCategories = [...new Set(data.map(item => item.categoria))];
        
        // Agregar la opción "Todas" y ponerla activa por defecto
        const allCategoriesHtml = '<label class="filter-option active" data-category="all">Todas</label>';
        
        categoryFiltersContainer.innerHTML = allCategoriesHtml + uniqueCategories.map(category => `
            <label class="filter-option" data-category="${category}">${category}</label>
        `).join('');

        // Añadir evento a los filtros de categoría
        document.querySelectorAll('.filter-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const currentActive = document.querySelector('.filter-option.active');
                if (currentActive) {
                    currentActive.classList.remove('active');
                }
                e.target.classList.add('active');
                filterProducts();
            });
        });
    }

    // --- Cargar Productos (MODIFICADO) ---
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
        
        allProducts = data; // Almacena todos los productos
        loadCategories(); // Carga las categorías una vez que los productos están disponibles
        filterProducts(); // Llama a la función de filtrado inicialmente para mostrar todos los productos
    }

    // --- Lógica del Carrito ---
    function updateCart() {
        renderCartItems();
        updateCartCount();
        updateCartTotal();
        localStorage.setItem('cart', JSON.stringify(cart));
    }
    
    function updateCartCount() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }

    function updateCartTotal() {
        const total = cart.reduce((sum, item) => sum + item.precio * item.quantity, 0);
        cartTotal.textContent = total.toFixed(2);
    }
    
    function renderCartItems() {
        cartItemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <img src="${item.imagen_url}" alt="${item.nombre}" class="cart-item__image">
                <div class="cart-item__info">
                    <span class="cart-item__name">${item.nombre}</span>
                    <span class="cart-item__price">$${item.precio.toFixed(2)}</span>
                </div>
                <div class="cart-item__actions">
                    <input type="number" value="${item.quantity}" min="1" class="cart-item__quantity">
                    <button class="cart-item__remove" data-id="${item.id}">&times; Eliminar</button>
                </div>
            </div>
        `).join('');
    }

    function addToCart(product) {
        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        updateCart();
    }
    
    function handleCartInteraction(e) {
        const target = e.target;
        if (target.matches('.cart-item__quantity')) {
            const id = parseInt(target.closest('.cart-item').dataset.id);
            const quantity = parseInt(target.value);
            const item = cart.find(item => item.id === id);
            if (item) {
                item.quantity = quantity;
            }
        } else if (target.matches('.cart-item__remove')) {
            const id = parseInt(target.dataset.id);
            cart = cart.filter(item => item.id !== id);
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

    // NUEVOS EVENT LISTENERS
    searchInput.addEventListener('input', filterProducts);
    filterPriceBtn.addEventListener('click', filterProducts);
    
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        minPriceInput.value = '0';
        maxPriceInput.value = '5000';
        const activeCategory = document.querySelector('.filter-option.active');
        if (activeCategory) {
            activeCategory.classList.remove('active');
        }
        // Seleccionar "Todas" por defecto
        const allOption = document.querySelector('.filter-option[data-category="all"]');
        if (allOption) {
            allOption.classList.add('active');
        }
        filterProducts();
    });

    // Inicialización
    loadProducts();
    updateCart();
});
