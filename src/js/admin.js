// --- Variables globales y elementos del DOM ---
const SUPABASE_URL = 'https://sliqaezclxbvlxwbqpjp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXFhZXpjbHhidmx4d2JxcGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTQwNzYsImV4cCI6MjA3MDg5MDA3Nn0.inNhc24bE0E6B9UOBnSBc0_sxsPrTX4JRaynET68Lsk';

const supabaseCliente = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        storageKey: 'admin-auth',
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

// const supabaseCliente = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// (Eliminado porque ya está declarado al inicio del archivo)

let currentSection = 'dashboard';
let notifications = [];
let categories = new Set();
let editingProduct = null;

// Elementos del DOM
const sections = {
    dashboard: document.getElementById('dashboard'),
    products: document.getElementById('products'),
    newProduct: document.getElementById('new-product')
};

const elements = {
    navItems: document.querySelectorAll('.nav-item'),
    searchInput: document.getElementById('search-products'),
    categoryFilter: document.getElementById('category-filter'),
    stockFilter: document.getElementById('stock-filter'),
    productsTableBody: document.getElementById('products-table-body'),
    notificationsList: document.getElementById('notifications-list'),
    notificationBadge: document.querySelector('.notification-badge'),
    editModal: document.getElementById('edit-modal'),
    confirmModal: document.getElementById('confirm-modal'),
    totalProducts: document.getElementById('total-products'),
    lowStock: document.getElementById('low-stock'),
    totalCategories: document.getElementById('total-categories'),
    productForm: document.getElementById('product-form'),
    submitButton: document.getElementById('submit-button'),
    imageUploadArea: document.getElementById('image-upload-area'),
    imageInput: document.getElementById('imagen'),
    imagePreview: document.getElementById('image-preview'),
    logoutButton: document.getElementById('logout-button')
};

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', async () => {
    await checkUserRole();
    await loadDashboardStats();
    setupEventListeners();
    await loadProducts();
});

// --- Verificación de Roles ---
async function checkUserRole() {
    try {
        const { data: { session }, error: sessionError } = await supabaseCliente.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session) {
            window.location.href = '/login.html';
            return;
        }

        // Subscribirse a cambios de sesión
        supabaseCliente.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                window.location.href = '/login.html';
            }
        });

        const { data: profile, error } = await supabaseCliente
            .from('perfiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (error) throw error;

        if (!profile || profile.role !== 'admin') {
            await supabaseCliente.auth.signOut();
            window.location.href = '/login.html';
            addNotification('Error', 'No tienes permisos de administrador', 'error');
            return;
        }

    } catch (error) {
        console.error('Error al verificar rol:', error);
        window.location.href = '/login.html';
    }

    if (error || !profile || profile.role !== 'admin') {
        await supabaseCliente.auth.signOut();
        window.location.href = '/login.html';
        addNotification('Error', 'No tienes permisos de administrador', 'error');
        return;
    }
}

// --- Configuración de Event Listeners ---
function setupEventListeners() {
    // Navegación
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.dataset.section) {
                switchSection(item.dataset.section);
            }
        });
    });

    // Filtros
    elements.searchInput.addEventListener('input', debounce(filterProducts, 300));
    elements.categoryFilter.addEventListener('change', filterProducts);
    elements.stockFilter.addEventListener('change', filterProducts);

    // Modales
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            elements.editModal.style.display = 'none';
            elements.confirmModal.style.display = 'none';
        });
    });

    // Logout
    elements.logoutButton.addEventListener('click', async () => {
        await supabaseCliente.auth.signOut();
        window.location.href = '/login.html';
    });

    // Subida de imágenes
    setupImageUpload();

    // Formulario de nuevo producto
    setupProductForm();
}

// --- Dashboard Stats ---
async function loadDashboardStats() {
    const { data: products, error } = await supabaseCliente
        .from('productos')
        .select('*');

    if (error) {
        addNotification('Error', 'Error al cargar estadísticas', 'error');
        return;
    }

    const stats = {
        total: products.length,
        lowStock: products.filter(p => p.stock < 5).length,
        categories: new Set(products.map(p => p.categoria)).size
    };

    elements.totalProducts.textContent = stats.total;
    elements.lowStock.textContent = stats.lowStock;
    elements.totalCategories.textContent = stats.categories;
}

// --- Gestión de Productos ---
async function loadProducts() {
    const { data: products, error } = await supabaseCliente
        .from('productos')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        addNotification('Error', 'Error al cargar productos', 'error');
        return;
    }

    // Actualizar categorías
    categories = new Set(products.map(p => p.categoria));
    updateCategoryFilter();

    // Renderizar productos
    renderProducts(products);
}

function renderProducts(products) {
    elements.productsTableBody.innerHTML = '';
    
    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <img src="${product.imagen_url}" alt="${product.nombre}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">
            </td>
            <td>${product.nombre}</td>
            <td>${product.categoria}</td>
            <td>$${product.precio.toFixed(2)}</td>
            <td class="${product.stock < 5 ? 'text-danger' : ''}">${product.stock}</td>
            <td>
                <button class="btn" onclick="editProduct(${product.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn danger" onclick="confirmDelete(${product.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        elements.productsTableBody.appendChild(row);
    });
}

function updateCategoryFilter() {
    elements.categoryFilter.innerHTML = '<option value="">Todas las categorías</option>';
    categories.forEach(category => {
        elements.categoryFilter.innerHTML += `<option value="${category}">${category}</option>`;
    });
}

async function filterProducts() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const categoryFilter = elements.categoryFilter.value;
    const stockFilter = elements.stockFilter.value;

    const { data: products, error } = await supabaseCliente
        .from('productos')
        .select('*');

    if (error) {
        addNotification('Error', 'Error al filtrar productos', 'error');
        return;
    }

    let filtered = products;

    // Aplicar filtros
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.nombre.toLowerCase().includes(searchTerm) ||
            p.descripcion.toLowerCase().includes(searchTerm)
        );
    }

    if (categoryFilter) {
        filtered = filtered.filter(p => p.categoria === categoryFilter);
    }

    if (stockFilter === 'low') {
        filtered = filtered.filter(p => p.stock < 5);
    } else if (stockFilter === 'out') {
        filtered = filtered.filter(p => p.stock === 0);
    }

    renderProducts(filtered);
}

// --- Edición de Productos ---
async function editProduct(id) {
    const { data: product, error } = await supabaseCliente
        .from('productos')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        addNotification('Error', 'Error al cargar el producto', 'error');
        return;
    }

    editingProduct = product;
    showEditModal(product);
}

function showEditModal(product) {
    const modalContent = elements.editModal.querySelector('.modal-content');
    modalContent.innerHTML = `
        <span class="close">&times;</span>
        <h2>Editar Producto</h2>
        <form id="edit-form" class="product-form">
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-nombre">Nombre del Producto</label>
                    <input type="text" id="edit-nombre" value="${product.nombre}" required>
                </div>
                <div class="form-group">
                    <label for="edit-descripcion">Descripción</label>
                    <textarea id="edit-descripcion" required rows="4">${product.descripcion}</textarea>
                </div>
                <div class="form-group">
                    <label for="edit-precio">Precio</label>
                    <input type="number" id="edit-precio" step="0.01" value="${product.precio}" required>
                </div>
                <div class="form-group">
                    <label for="edit-stock">Stock</label>
                    <input type="number" id="edit-stock" value="${product.stock}" required>
                </div>
                <div class="form-group">
                    <label for="edit-categoria">Categoría</label>
                    <input type="text" id="edit-categoria" value="${product.categoria}" required>
                </div>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn primary">
                    <i class="fas fa-save"></i> Guardar Cambios
                </button>
                <button type="button" class="btn secondary" onclick="elements.editModal.style.display='none'">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            </div>
        </form>
    `;

    elements.editModal.style.display = 'block';

    // Event Listener para el formulario
    document.getElementById('edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateProduct(product.id);
    });

    // Event Listener para cerrar modal
    elements.editModal.querySelector('.close').addEventListener('click', () => {
        elements.editModal.style.display = 'none';
    });
}

async function updateProduct(id) {
    const updatedProduct = {
        nombre: document.getElementById('edit-nombre').value,
        descripcion: document.getElementById('edit-descripcion').value,
        precio: parseFloat(document.getElementById('edit-precio').value),
        stock: parseInt(document.getElementById('edit-stock').value),
        categoria: document.getElementById('edit-categoria').value
    };

    const { error } = await supabaseCliente
        .from('productos')
        .update(updatedProduct)
        .eq('id', id);

    if (error) {
        addNotification('Error', 'Error al actualizar el producto', 'error');
        return;
    }

    elements.editModal.style.display = 'none';
    addNotification('Éxito', 'Producto actualizado correctamente', 'success');
    await loadProducts();
}

// --- Gestión de Imágenes ---
function setupImageUpload() {
    elements.imageUploadArea.addEventListener('click', () => elements.imageInput.click());
    elements.imageInput.addEventListener('change', (e) => handleFiles(e.target.files));
    elements.imageUploadArea.addEventListener('dragover', (e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        elements.imageUploadArea.style.borderColor = 'var(--admin-primary)'; 
    });
    elements.imageUploadArea.addEventListener('dragleave', (e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        elements.imageUploadArea.style.borderColor = '#ddd'; 
    });
    elements.imageUploadArea.addEventListener('drop', (e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        elements.imageUploadArea.style.borderColor = '#ddd'; 
        handleFiles(e.dataTransfer.files); 
    });
}

function handleFiles(files) {
    const file = files[0];
    if (file && file.type.startsWith('image/')) {
        elements.imageInput.files = files;
        const reader = new FileReader();
        reader.onload = (e) => { 
            elements.imagePreview.src = e.target.result;
            elements.imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// --- Formulario de Nuevo Producto ---
function setupProductForm() {
    elements.productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        elements.submitButton.disabled = true;
        elements.submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        const file = elements.imageInput.files[0];
        if (!file) {
            addNotification('Error', 'Por favor, selecciona una imagen para el producto', 'error');
            elements.submitButton.disabled = false;
            elements.submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Producto';
            return;
        }

        try {
            // Subir imagen
            const filePath = `public/${Date.now()}-${file.name}`;
            const { data: uploadData, error: uploadError } = await supabaseCliente.storage
                .from('productos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Obtener URL pública
            const { data: urlData } = supabaseCliente.storage
                .from('productos')
                .getPublicUrl(uploadData.path);

            // Crear producto
            const productData = {
                nombre: document.getElementById('nombre').value,
                descripcion: document.getElementById('descripcion').value,
                precio: parseFloat(document.getElementById('precio').value),
                stock: parseInt(document.getElementById('stock').value),
                categoria: document.getElementById('categoria').value,
                imagen_url: urlData.publicUrl,
            };

            const { error: insertError } = await supabaseCliente
                .from('productos')
                .insert([productData]);

            if (insertError) throw insertError;

            addNotification('Éxito', '¡Producto guardado correctamente!', 'success');
            elements.productForm.reset();
            elements.imagePreview.src = '';
            elements.imagePreview.style.display = 'none';
            
            // Actualizar datos
            await loadProducts();
            await loadDashboardStats();

        } catch (error) {
            addNotification('Error', `Error al guardar el producto: ${error.message}`, 'error');
        } finally {
            elements.submitButton.disabled = false;
            elements.submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Producto';
        }
    });
}

// --- Eliminación de Productos ---
function confirmDelete(id) {
    elements.confirmModal.style.display = 'block';
    document.getElementById('confirm-message').textContent = '¿Estás seguro de que deseas eliminar este producto?';

    document.getElementById('confirm-yes').onclick = async () => {
        await deleteProduct(id);
        elements.confirmModal.style.display = 'none';
    };

    document.getElementById('confirm-no').onclick = () => {
        elements.confirmModal.style.display = 'none';
    };
}

async function deleteProduct(id) {
    try {
        // Obtener la URL de la imagen primero
        const { data: product, error: fetchError } = await supabaseCliente
            .from('productos')
            .select('imagen_url')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        // Eliminar el producto
        const { error: deleteError } = await supabaseCliente
            .from('productos')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        // Intentar eliminar la imagen si existe
        if (product.imagen_url) {
            const imagePath = product.imagen_url.split('/').pop();
            await supabaseCliente.storage
                .from('productos')
                .remove([`public/${imagePath}`]);
        }

        addNotification('Éxito', 'Producto eliminado correctamente', 'success');
        await loadProducts();
        await loadDashboardStats();

    } catch (error) {
        addNotification('Error', `Error al eliminar el producto: ${error.message}`, 'error');
    }
}

// --- Notificaciones ---
function addNotification(title, message, type = 'info') {
    const notification = {
        id: Date.now(),
        title,
        message,
        type,
        timestamp: new Date()
    };

    notifications.unshift(notification);
    if (notifications.length > 5) notifications.pop();
    updateNotifications();
}

function updateNotifications() {
    elements.notificationBadge.textContent = notifications.length;
    
    const notificationsList = document.getElementById('notifications-list');
    notificationsList.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.type}">
            <h4>${notification.title}</h4>
            <p>${notification.message}</p>
            <small>${notification.timestamp.toLocaleTimeString()}</small>
        </div>
    `).join('');
}

// --- Utilidades ---
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function switchSection(sectionName) {
    Object.values(sections).forEach(section => {
        section.classList.remove('active');
    });
    sections[sectionName].classList.add('active');
    
    elements.navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });

    currentSection = sectionName;
    
    if (sectionName === 'products') {
        loadProducts();
    } else if (sectionName === 'dashboard') {
        loadDashboardStats();
    }
}



// --- Lógica Principal ---
document.addEventListener('DOMContentLoaded', () => {
    checkUserSession();
    setupImageUpload();
});

// Proteger la página
async function checkUserSession() {
    const { data: { session } } = await supabaseCliente.auth.getSession();
    if (!session) {
        window.location.href = '/login.html';
    }
}

// Cerrar sesión
logoutButton.addEventListener('click', async () => {
    await supabaseCliente.auth.signOut();
    window.location.href = '/login.html';
});

// Lógica para subir y previsualizar imágenes
function setupImageUpload() {
    imageUploadArea.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', (e) => handleFiles(e.target.files));
    imageUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); imageUploadArea.style.borderColor = 'var(--color-primary)'; });
    imageUploadArea.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); imageUploadArea.style.borderColor = '#ccc'; });
    imageUploadArea.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); imageUploadArea.style.borderColor = '#ccc'; handleFiles(e.dataTransfer.files); });
}

function handleFiles(files) {
    const file = files[0];
    if (file && file.type.startsWith('image/')) {
        imageInput.files = files;
        const reader = new FileReader();
        reader.onload = (e) => { imagePreview.src = e.target.result; };
        reader.readAsDataURL(file);
    }
}

// Guardar el producto
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'Guardando...';

    const file = imageInput.files[0];
    if (!file) {
        alert('Por favor, selecciona una imagen para el producto.');
        submitButton.disabled = false;
        submitButton.textContent = 'Guardar Producto';
        return;
    }

    const filePath = `public/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabaseCliente.storage
        .from('productos')
        .upload(filePath, file);

    if (uploadError) {
        alert('Error al subir la imagen: ' + uploadError.message);
        console.error(uploadError); // Para ver el error detallado en consola
        submitButton.disabled = false;
        submitButton.textContent = 'Guardar Producto';
        return;
    }

    const { data: urlData } = supabaseCliente.storage
        .from('productos')
        .getPublicUrl(uploadData.path);
    
    const productData = {
        nombre: document.getElementById('nombre').value,
        descripcion: document.getElementById('descripcion').value,
        precio: parseFloat(document.getElementById('precio').value),
        stock: parseInt(document.getElementById('stock').value),
        categoria: document.getElementById('categoria').value,
        imagen_url: urlData.publicUrl,
    };

    const { error: insertError } = await supabaseCliente
        .from('productos')
        .insert([productData]);

    if (insertError) {
        alert('Error al guardar el producto: ' + insertError.message);
    } else {
        alert('¡Producto guardado con éxito!');
        productForm.reset();
        imagePreview.src = '';
    }
    
    submitButton.disabled = false;
    submitButton.textContent = 'Guardar Producto';
});