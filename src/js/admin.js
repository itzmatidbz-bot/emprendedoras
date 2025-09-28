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
    try {
        await checkUserRole();
        setupEventListeners();
        await loadDashboardStats();
        await loadProducts();
        addNotification('Éxito', 'Panel de administración cargado correctamente', 'success');
    } catch (error) {
        console.error('Error en la inicialización:', error);
        addNotification('Error', 'Error al cargar el panel de administración', 'error');
    }
});

// --- Verificación de Roles ---
async function checkUserRole() {
    try {
        // Verificar sesión
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

        // Verificar rol de administrador
        const { data: profile, error: profileError } = await supabaseCliente
            .from('perfiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (profileError) throw profileError;

        if (!profile || profile.role !== 'admin') {
            await supabaseCliente.auth.signOut();
            window.location.href = '/login.html';
            addNotification('Error', 'No tienes permisos de administrador', 'error');
            return;
        }

        console.log('Rol de administrador verificado correctamente');
        return true;

    } catch (error) {
        console.error('Error al verificar rol:', error);
        await supabaseCliente.auth.signOut();
        window.location.href = '/login.html';
        addNotification('Error', 'Error de autenticación', 'error');
        return false;
    }
}

// --- Configuración de Event Listeners ---
function setupEventListeners() {
    try {
        console.log('Configurando event listeners...');

        // Navegación
        elements.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                if (item.dataset.section) {
                    switchSection(item.dataset.section);
                }
            });
        });

        // Panel de notificaciones
        const notificationsIcon = document.querySelector('.notifications');
        const notificationsPanel = document.getElementById('notifications-panel');
        if (notificationsIcon && notificationsPanel) {
            notificationsIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                notificationsPanel.classList.toggle('show');
            });

            document.addEventListener('click', (e) => {
                if (!notificationsPanel.contains(e.target) && !notificationsIcon.contains(e.target)) {
                    notificationsPanel.classList.remove('show');
                }
            });
        }

        // Filtros con debounce y validación
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', debounce(() => {
                console.log('Buscando productos...');
                filterProducts();
            }, 300));
        }

        if (elements.categoryFilter) {
            elements.categoryFilter.addEventListener('change', () => {
                console.log('Filtrando por categoría...');
                filterProducts();
            });
        }

        if (elements.stockFilter) {
            elements.stockFilter.addEventListener('change', () => {
                console.log('Filtrando por stock...');
                filterProducts();
            });
        }

        // Modales con mejor manejo
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                const modal = closeBtn.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });

        // Logout con confirmación
        if (elements.logoutButton) {
            elements.logoutButton.addEventListener('click', async (e) => {
                e.preventDefault();
                if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                    try {
                        await supabaseCliente.auth.signOut();
                        window.location.href = '/login.html';
                    } catch (error) {
                        console.error('Error al cerrar sesión:', error);
                        addNotification('Error', 'Error al cerrar sesión', 'error');
                    }
                }
            });
        }

        // Subida de imágenes
        setupImageUpload();

        // Formulario de nuevo producto
        setupProductForm();

        console.log('Event listeners configurados correctamente');
    } catch (error) {
        console.error('Error al configurar event listeners:', error);
        addNotification('Error', 'Error al configurar la interfaz', 'error');
    }
}

// --- Dashboard Stats ---
async function loadDashboardStats() {
    try {
        console.log('Cargando estadísticas...');
        const { data: products, error } = await supabaseCliente
            .from('productos')
            .select('*');

        if (error) throw error;

        if (!products) {
            console.log('No se encontraron productos');
            elements.totalProducts.textContent = '0';
            elements.lowStock.textContent = '0';
            elements.totalCategories.textContent = '0';
            return;
        }

        console.log('Productos cargados:', products.length);

        const stats = {
            total: products.length,
            lowStock: products.filter(p => p.stock < 5).length,
            categories: new Set(products.map(p => p.categoria)).size
        };

        elements.totalProducts.textContent = stats.total;
        elements.lowStock.textContent = stats.lowStock;
        elements.totalCategories.textContent = stats.categories;

        console.log('Estadísticas actualizadas:', stats);
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        addNotification('Error', 'Error al cargar las estadísticas', 'error');
        elements.totalProducts.textContent = '0';
        elements.lowStock.textContent = '0';
        elements.totalCategories.textContent = '0';
    }
}

// --- Gestión de Productos ---
async function loadProducts() {
    try {
        console.log('Cargando productos...');
        const { data: products, error } = await supabaseCliente
            .from('productos')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        if (!products || products.length === 0) {
            console.log('No se encontraron productos');
            elements.productsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No hay productos disponibles</td>
                </tr>
            `;
            categories = new Set();
            updateCategoryFilter();
            return;
        }

        console.log('Productos encontrados:', products.length);

        // Actualizar categorías
        categories = new Set(products.map(p => p.categoria));
        updateCategoryFilter();

        // Renderizar productos
        renderProducts(products);
        
        console.log('Productos cargados exitosamente');
    } catch (error) {
        console.error('Error al cargar productos:', error);
        addNotification('Error', 'Error al cargar los productos', 'error');
        elements.productsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">Error al cargar los productos</td>
            </tr>
        `;
    }
}

function renderProducts(products) {
    try {
        if (!Array.isArray(products)) {
            console.error('Los productos no son un array:', products);
            throw new Error('Formato de datos inválido');
        }

        elements.productsTableBody.innerHTML = '';
        
        if (products.length === 0) {
            elements.productsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No hay productos disponibles</td>
                </tr>
            `;
            return;
        }

        products.forEach(product => {
            if (!product || !product.id) {
                console.warn('Producto inválido:', product);
                return;
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <img src="${product.imagen_url || '/placeholder.jpg'}" 
                         alt="${product.nombre || 'Producto'}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;"
                         onerror="this.src='/placeholder.jpg'">
                </td>
                <td>${product.nombre || 'Sin nombre'}</td>
                <td>${product.categoria || 'Sin categoría'}</td>
                <td>$${(product.precio || 0).toFixed(2)}</td>
                <td class="${(product.stock || 0) < 5 ? 'text-danger' : ''}">                    ${product.stock || 0}
                </td>
                <td>
                    <button class="btn btn-edit" onclick="event.preventDefault(); editProduct(${product.id});">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete" onclick="event.preventDefault(); confirmDelete(${product.id});">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            elements.productsTableBody.appendChild(row);
        });

        // Agregar event listeners para los botones
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });

    } catch (error) {
        console.error('Error al renderizar productos:', error);
        addNotification('Error', 'Error al mostrar los productos', 'error');
        elements.productsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">Error al mostrar los productos</td>
            </tr>
        `;
    }
}

function updateCategoryFilter() {
    elements.categoryFilter.innerHTML = '<option value="">Todas las categorías</option>';
    categories.forEach(category => {
        elements.categoryFilter.innerHTML += `<option value="${category}">${category}</option>`;
    });
}

async function filterProducts() {
    try {
        const searchTerm = elements.searchInput?.value.toLowerCase() || '';
        const categoryFilter = elements.categoryFilter?.value || '';
        const stockFilter = elements.stockFilter?.value || '';

        console.log('Aplicando filtros:', { searchTerm, categoryFilter, stockFilter });

        const { data: products, error } = await supabaseCliente
            .from('productos')
            .select('*');

        if (error) throw error;

        if (!products) {
            console.log('No se encontraron productos para filtrar');
            renderProducts([]);
            return;
        }

        let filtered = [...products];

        // Aplicar filtros de forma segura
        if (searchTerm) {
            filtered = filtered.filter(p => 
                (p.nombre?.toLowerCase() || '').includes(searchTerm) ||
                (p.descripcion?.toLowerCase() || '').includes(searchTerm)
            );
        }

        if (categoryFilter) {
            filtered = filtered.filter(p => p.categoria === categoryFilter);
        }

        if (stockFilter === 'low') {
            filtered = filtered.filter(p => (p.stock || 0) < 5);
        } else if (stockFilter === 'out') {
            filtered = filtered.filter(p => (p.stock || 0) === 0);
        }

        console.log(`Productos filtrados: ${filtered.length} de ${products.length}`);
        renderProducts(filtered);

    } catch (error) {
        console.error('Error al filtrar productos:', error);
        addNotification('Error', 'Error al filtrar los productos', 'error');
        renderProducts([]);
    }
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
    elements.editModal.style.display = 'block';
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
                <button type="submit" class="btn primary" id="edit-submit-button">
                    <i class="fas fa-save"></i> Guardar Cambios
                </button>
                <button type="button" class="btn secondary" id="edit-cancel-button">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            </div>
        </form>
    `;

    const form = document.getElementById('edit-form');
    const closeButton = elements.editModal.querySelector('.close');
    const cancelButton = document.getElementById('edit-cancel-button');
    const submitButton = document.getElementById('edit-submit-button');

    // Remover event listeners anteriores
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    // Agregar nuevos event listeners
    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        try {
            await updateProduct(product.id);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
        }
    });

    const closeModal = () => {
        elements.editModal.style.display = 'none';
    };

    closeButton.addEventListener('click', closeModal);
    cancelButton.addEventListener('click', closeModal);

    // Cerrar modal al hacer clic fuera
    elements.editModal.addEventListener('click', (e) => {
        if (e.target === elements.editModal) {
            closeModal();
        }
    });
}

async function updateProduct(id) {
    try {
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

        if (error) throw error;

        addNotification('Éxito', 'Producto actualizado correctamente', 'success');
        await loadProducts();
        elements.editModal.style.display = 'none';
    } catch (error) {
        console.error('Error al actualizar:', error);
        addNotification('Error', `Error al actualizar el producto: ${error.message}`, 'error');
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
    const confirmButton = document.getElementById('confirm-yes');
    const cancelButton = document.getElementById('confirm-no');

    try {
        confirmButton.disabled = true;
        confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';

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
            try {
                const imagePath = product.imagen_url.split('/').pop();
                await supabaseCliente.storage
                    .from('productos')
                    .remove([`public/${imagePath}`]);
            } catch (storageError) {
                console.warn('Error al eliminar la imagen:', storageError);
                // Continuamos aunque falle la eliminación de la imagen
            }
        }

        addNotification('Éxito', 'Producto eliminado correctamente', 'success');
        await loadProducts();
        await loadDashboardStats();
        elements.confirmModal.style.display = 'none';

    } catch (error) {
        console.error('Error al eliminar:', error);
        addNotification('Error', `Error al eliminar el producto: ${error.message}`, 'error');
    } finally {
        confirmButton.disabled = false;
        confirmButton.innerHTML = 'Sí';
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
    try {
        console.log('Cambiando a sección:', sectionName);
        
        if (!sections[sectionName]) {
            console.error('Sección no encontrada:', sectionName);
            return;
        }

        // Ocultar todas las secciones
        Object.values(sections).forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });

        // Mostrar la sección seleccionada
        sections[sectionName].classList.add('active');
        sections[sectionName].style.display = 'block';
        
        // Actualizar navegación
        elements.navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === sectionName) {
                item.classList.add('active');
            }
        });

        currentSection = sectionName;
        
        // Cargar datos según la sección
        if (sectionName === 'products') {
            loadProducts().catch(error => {
                console.error('Error al cargar productos:', error);
                addNotification('Error', 'Error al cargar los productos', 'error');
            });
        } else if (sectionName === 'dashboard') {
            loadDashboardStats().catch(error => {
                console.error('Error al cargar estadísticas:', error);
                addNotification('Error', 'Error al cargar las estadísticas', 'error');
            });
        }

        console.log('Sección cambiada exitosamente a:', sectionName);
} catch (error) {
        console.error('Error al cambiar sección:', error);
        addNotification('Error', 'Error al cambiar de sección', 'error');
    }
}   

