const SUPABASE_URL = 'https://sliqaezclxbvlxwbqpjp.supabase.co'; // <-- ¡Pega tu URL aquí!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXFhZXpjbHhidmx4d2JxcGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTQwNzYsImV4cCI6MjA3MDg5MDA3Nn0.inNhc24bE0E6B9UOBnSBc0_sxsPrTX4JRaynET68Lsk'; // <-- ¡Pega tu clave anónima aquí!
const supabase = self.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Estado de la Aplicación ---
let allProducts = [];
let editingProductId = null;

// --- Selectores del DOM ---
const DOMElements = {
    // Secciones
    sections: document.querySelectorAll('.admin-section'),
    // Navegación
    navItems: document.querySelectorAll('.nav-item'),
    sidebar: document.querySelector('.admin-sidebar'),
    // Menú Móvil
    menuToggle: document.getElementById('menu-toggle'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    // Dashboard
    totalProducts: document.getElementById('total-products'),
    lowStock: document.getElementById('low-stock'),
    totalCategories: document.getElementById('total-categories'),
    // Productos
    productsTableBody: document.getElementById('products-table-body'),
    searchInput: document.getElementById('search-products'),
    categoryFilter: document.getElementById('category-filter'),
    stockFilter: document.getElementById('stock-filter'),
    // Formulario de Producto (Crear/Editar)
    productFormSection: document.getElementById('new-product'),
    productForm: document.getElementById('product-form'),
    formTitle: document.querySelector('#new-product h2'),
    submitButton: document.getElementById('submit-button'),
    imageUploadArea: document.getElementById('image-upload-area'),
    imageInput: document.getElementById('imagen'),
    imagePreview: document.getElementById('image-preview'),
    // Modales
    confirmModal: document.getElementById('confirm-modal'),
    confirmMessage: document.getElementById('confirm-message'),
    confirmYesBtn: document.getElementById('confirm-yes'),
    confirmNoBtn: document.getElementById('confirm-no'),
    // Botones
    logoutButton: document.getElementById('logout-button')
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    await checkUserRole();
    setupEventListeners();
    await loadInitialData();
    switchSection('dashboard');
});

/**
 * Verifica si el usuario tiene una sesión activa y es administrador.
 */
async function checkUserRole() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    }
}

/**
 * Configura todos los event listeners de la aplicación.
 */
function setupEventListeners() {
    // Navegación principal y cierre de menú móvil
    DOMElements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (DOMElements.sidebar.classList.contains('active')) {
                toggleMobileMenu();
            }
            const section = e.currentTarget.dataset.section;
            if (section) {
                switchSection(section);
            }
        });
    });

    // Menú móvil
    DOMElements.menuToggle.addEventListener('click', toggleMobileMenu);
    DOMElements.sidebarOverlay.addEventListener('click', toggleMobileMenu);

    // Cerrar sesión
    DOMElements.logoutButton.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    });
    
    // Filtros
    DOMElements.searchInput.addEventListener('input', debounce(renderProductsTable, 300));
    DOMElements.categoryFilter.addEventListener('change', renderProductsTable);
    DOMElements.stockFilter.addEventListener('change', renderProductsTable);

    // Formulario
    DOMElements.productForm.addEventListener('submit', handleProductFormSubmit);
    DOMElements.productForm.addEventListener('reset', resetProductForm);

    // Tabla
    DOMElements.productsTableBody.addEventListener('click', handleTableActions);
    setupImageUploadListeners();
    
    // Modal
    DOMElements.confirmNoBtn.addEventListener('click', () => DOMElements.confirmModal.style.display = 'none');
}

/**
 * Carga los datos iniciales para el panel.
 */
async function loadInitialData() {
    try {
        const { data, error } = await supabase.from('productos').select('*').order('id', { ascending: true });
        if (error) throw error;
        allProducts = data;
        
        updateDashboardStats();
        updateCategoryFilter();
        renderProductsTable();
    } catch (error) {
        alert('Error al cargar los datos iniciales: ' + error.message);
    }
}

// --- LÓGICA DE MENÚ MÓVIL ---
/**
 * Muestra u oculta el menú lateral en dispositivos móviles.
 */
function toggleMobileMenu() {
    DOMElements.sidebar.classList.toggle('active');
    DOMElements.sidebarOverlay.classList.toggle('active');
}

// --- LÓGICA DE SECCIONES ---
function switchSection(sectionName) {
    if (sectionName === 'new-product') {
        resetProductForm();
    }

    DOMElements.sections.forEach(section => {
        section.classList.toggle('active', section.id === sectionName);
    });

    DOMElements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionName);
    });
    
    if(sectionName === 'dashboard') updateDashboardStats();
    if(sectionName === 'products') renderProductsTable();
}

// --- DASHBOARD ---
function updateDashboardStats() {
    const stats = {
        total: allProducts.length,
        lowStock: allProducts.filter(p => p.stock > 0 && p.stock < 5).length,
        categories: new Set(allProducts.map(p => p.categoria)).size
    };
    DOMElements.totalProducts.textContent = stats.total;
    DOMElements.lowStock.textContent = stats.lowStock;
    DOMElements.totalCategories.textContent = stats.categories;
}

// --- GESTIÓN DE PRODUCTOS (TABLA) ---
function renderProductsTable() {
    const searchTerm = DOMElements.searchInput.value.toLowerCase();
    const category = DOMElements.categoryFilter.value;
    const stock = DOMElements.stockFilter.value;

    const filteredProducts = allProducts.filter(p => {
        const matchesSearch = p.nombre.toLowerCase().includes(searchTerm) || (p.descripcion && p.descripcion.toLowerCase().includes(searchTerm));
        const matchesCategory = !category || p.categoria === category;
        const matchesStock = !stock || (stock === 'low' && p.stock < 5 && p.stock > 0) || (stock === 'out' && p.stock === 0);
        return matchesSearch && matchesCategory && matchesStock;
    });

    DOMElements.productsTableBody.innerHTML = filteredProducts.map(product => `
        <tr data-id="${product.id}">
            <td><img src="${product.imagen_url}" alt="${product.nombre}" class="product-table-img"></td>
            <td>${product.nombre}</td>
            <td>${product.categoria}</td>
            <td>$${product.precio.toFixed(2)}</td>
            <td class="${product.stock < 5 ? 'low-stock' : ''}">${product.stock}</td>
            <td>
                <button class="btn-icon edit" data-action="edit" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon danger" data-action="delete" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function handleTableActions(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const action = button.dataset.action;
    const row = button.closest('tr');
    const productId = parseInt(row.dataset.id);

    if (action === 'edit') {
        openEditForm(productId);
    } else if (action === 'delete') {
        confirmDelete(productId);
    }
}

function updateCategoryFilter() {
    const categories = [...new Set(allProducts.map(p => p.categoria))];
    DOMElements.categoryFilter.innerHTML = '<option value="">Todas las categorías</option>';
    categories.forEach(cat => {
        DOMElements.categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
}

// --- GESTIÓN DE PRODUCTOS (FORMULARIO) ---
function openEditForm(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    editingProductId = productId;

    DOMElements.productForm.nombre.value = product.nombre;
    DOMElements.productForm.descripcion.value = product.descripcion;
    DOMElements.productForm.precio.value = product.precio;
    DOMElements.productForm.stock.value = product.stock;
    DOMElements.productForm.categoria.value = product.categoria;
    DOMElements.imagePreview.src = product.imagen_url;
    DOMElements.imagePreview.style.display = 'block';

    DOMElements.formTitle.textContent = 'Editar Producto';
    DOMElements.submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
    
    switchSection('new-product');
}

async function handleProductFormSubmit(e) {
    e.preventDefault();
    DOMElements.submitButton.disabled = true;
    DOMElements.submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        const formData = new FormData(DOMElements.productForm);
        const productData = {
            nombre: formData.get('nombre'),
            descripcion: formData.get('descripcion'),
            precio: parseFloat(formData.get('precio')),
            stock: parseInt(formData.get('stock')),
            categoria: formData.get('categoria'),
        };

        const file = DOMElements.imageInput.files[0];
        let imageUrl;

        if (file) {
            imageUrl = await uploadImage(file);
        } else if (editingProductId) {
            const existingProduct = allProducts.find(p => p.id === editingProductId);
            imageUrl = existingProduct.imagen_url;
        } else {
            throw new Error('Debes seleccionar una imagen para el nuevo producto.');
        }

        productData.imagen_url = imageUrl;

        let error;
        if (editingProductId) {
            const { error: updateError } = await supabase.from('productos').update(productData).eq('id', editingProductId);
            error = updateError;
        } else {
            const { error: insertError } = await supabase.from('productos').insert([productData]);
            error = insertError;
        }

        if (error) throw error;

        alert(`Producto ${editingProductId ? 'actualizado' : 'creado'} con éxito!`);
        await loadInitialData();
        switchSection('products');

    } catch (error) {
        alert('Error al guardar el producto: ' + error.message);
    } finally {
        DOMElements.submitButton.disabled = false;
    }
}

function resetProductForm() {
    editingProductId = null;
    DOMElements.productForm.reset();
    DOMElements.imagePreview.src = '';
    DOMElements.imagePreview.style.display = 'none';
    DOMElements.imageInput.value = '';
    DOMElements.formTitle.textContent = 'Añadir Nuevo Producto';
    DOMElements.submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Producto';
}

// --- GESTIÓN DE IMÁGENES ---
async function uploadImage(file) {
    const filePath = `public/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('productos').upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('productos').getPublicUrl(filePath);
    return data.publicUrl;
}

function setupImageUploadListeners() {
    DOMElements.imageUploadArea.addEventListener('click', () => DOMElements.imageInput.click());
    DOMElements.imageInput.addEventListener('change', (e) => handleFileSelect(e.target.files));
    ['dragover', 'dragleave', 'drop'].forEach(eventName => {
        DOMElements.imageUploadArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (eventName === 'dragover') e.currentTarget.classList.add('dragover');
            if (eventName === 'dragleave' || eventName === 'drop') e.currentTarget.classList.remove('dragover');
            if (eventName === 'drop') handleFileSelect(e.dataTransfer.files);
        });
    });
}

function handleFileSelect(files) {
    const file = files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            DOMElements.imagePreview.src = e.target.result;
            DOMElements.imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// --- ELIMINACIÓN DE PRODUCTOS ---
function confirmDelete(productId) {
    const product = allProducts.find(p => p.id === productId);
    DOMElements.confirmMessage.textContent = `¿Estás seguro de que deseas eliminar el producto "${product.nombre}"? Esta acción no se puede deshacer.`;
    DOMElements.confirmModal.style.display = 'block';

    DOMElements.confirmYesBtn.onclick = () => {
        deleteProduct(productId);
        DOMElements.confirmModal.style.display = 'none';
    };
}

async function deleteProduct(productId) {
    try {
        const { error: deleteError } = await supabase.from('productos').delete().eq('id', productId);
        if (deleteError) throw deleteError;

        const productToDelete = allProducts.find(p => p.id === productId);
        if (productToDelete && productToDelete.imagen_url) {
            const fileName = productToDelete.imagen_url.split('/').pop();
            await supabase.storage.from('productos').remove([`public/${fileName}`]);
        }
        
        alert('Producto eliminado con éxito.');
        await loadInitialData();

    } catch (error) {
        alert('Error al eliminar el producto: ' + error.message);
    }
}

// --- UTILIDADES ---
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

