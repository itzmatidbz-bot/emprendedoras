// =====================================================
// 🌟 EMPRENDEDORAS DE ACERO - ADMIN MEJORADO CON IA
// =====================================================

// Variables globales
let editingProductId = null;
let selectedImages = [];
let imageCounter = 0;
let currentProductsData = [];
let categoriesData = {};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌟 Emprendedoras de Acero - Admin con IA iniciando...');
    
    // Proteger página
    await protectPage();
    
    // Cargar datos iniciales
    await loadCategoriesData();
    const allData = await loadInitialData();
    
    if (allData) {
        renderUI(allData);
        setupEventListeners(allData.products);
    }
    
    console.log('✅ Sistema cargado completamente');

    // =====================================================
    // 🔐 PROTECCIÓN DE PÁGINA
    // =====================================================
    async function protectPage() {
        try {
            const { data: { session }, error } = await supabaseCliente.auth.getSession();
            
            if (error) {
                console.error('Error de sesión:', error);
                window.location.href = '/login.html';
                return;
            }
            
            if (!session) {
                window.location.href = '/login.html';
                return;
            }
            
            console.log('✅ Usuario autenticado correctamente');
            
        } catch (error) {
            console.error('Error al verificar sesión:', error);
            window.location.href = '/login.html';
        }
    }

    // =====================================================
    // 🏷️ CARGA DE DATOS DE CATEGORIZACIÓN
    // =====================================================
    async function loadCategoriesData() {
        try {
            console.log('📋 Cargando datos de categorización...');
            
            // Cargar categorías principales
            const { data: categorias, error: catError } = await supabaseCliente
                .from('categorias_nuevas')
                .select('*')
                .eq('activo', true)
                .order('nombre');
            
            if (catError) throw catError;
            
            // Cargar tipos de producto
            const { data: tipos, error: tiposError } = await supabaseCliente
                .from('tipos_producto')
                .select('*, categorias_nuevas(nombre)')
                .eq('activo', true)
                .order('nombre');
            
            if (tiposError) throw tiposError;
            
            // Cargar materiales
            const { data: materiales, error: matError } = await supabaseCliente
                .from('materiales')
                .select('*')
                .eq('activo', true)
                .order('nombre');
            
            if (matError) throw matError;
            
            // Cargar colores
            const { data: colores, error: colError } = await supabaseCliente
                .from('colores_productos')
                .select('*')
                .eq('activo', true)
                .order('nombre');
            
            if (colError) throw colError;
            
            // Organizar datos
            categoriesData = {
                categorias: categorias || [],
                tipos: tipos || [],
                materiales: materiales || [],
                colores: colores || []
            };
            
            console.log('✅ Datos de categorización cargados:', categoriesData);
            
            // Poblar selects
            populateSelects();
            setupCategoryDependencies();
            
        } catch (error) {
            console.error('❌ Error cargando categorización:', error);
            loadFallbackCategories();
        }
    }

    function populateSelects() {
        // Poblar categorías
        populateSelect('categoria-nueva', categoriesData.categorias, 'Selecciona una categoría');
        
        // Poblar materiales
        populateSelect('material', categoriesData.materiales, 'Selecciona un material');
        
        // Poblar colores disponibles
        populateMultiColorSelect(categoriesData.colores);
    }

    function populateSelect(selectId, options, placeholder) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = `<option value="">${placeholder}</option>`;
        
        options.forEach(option => {
            select.innerHTML += `<option value="${option.id}">${option.nombre}</option>`;
        });
    }

    function populateMultiColorSelect(colores) {
        const container = document.getElementById('colores-grid');
        if (!container) return;
        
        container.innerHTML = '';
        
        colores.forEach(color => {
            const colorDiv = document.createElement('div');
            colorDiv.className = 'color-option';
            colorDiv.innerHTML = `
                <input type="checkbox" id="color-${color.id}" value="${color.nombre}">
                <label for="color-${color.id}">
                    <div class="color-swatch" style="background-color: ${color.codigo_hex || '#ccc'}"></div>
                    <span class="color-name">${color.nombre}</span>
                </label>
            `;
            container.appendChild(colorDiv);
        });
        
        // Event listeners para colores
        container.addEventListener('change', updateSelectedColors);
    }

    function updateSelectedColors() {
        const selectedColors = [];
        document.querySelectorAll('#colores-grid input[type="checkbox"]:checked').forEach(checkbox => {
            selectedColors.push(checkbox.value);
        });
        
        // Mostrar colores seleccionados
        const display = document.getElementById('selected-colors-display') || createSelectedColorsDisplay();
        display.textContent = selectedColors.length > 0 ? 
            `Colores seleccionados: ${selectedColors.join(', ')}` : 
            'Ningún color seleccionado';
    }

    function createSelectedColorsDisplay() {
        const display = document.createElement('div');
        display.id = 'selected-colors-display';
        display.className = 'selected-colors-display';
        const container = document.getElementById('colores-grid').parentNode;
        container.appendChild(display);
        return display;
    }

    function setupCategoryDependencies() {
        const categoriaSelect = document.getElementById('categoria-nueva');
        const tipoSelect = document.getElementById('tipo-producto');
        
        if (!categoriaSelect || !tipoSelect) return;
        
        categoriaSelect.addEventListener('change', (e) => {
            const categoriaId = e.target.value;
            
            // Limpiar tipos
            tipoSelect.innerHTML = '<option value="">Selecciona un tipo</option>';
            
            if (categoriaId) {
                // Filtrar tipos por categoría
                const tiposFiltrados = categoriesData.tipos.filter(tipo => 
                    tipo.categoria_id == categoriaId
                );
                
                tiposFiltrados.forEach(tipo => {
                    tipoSelect.innerHTML += `<option value="${tipo.id}">${tipo.nombre}</option>`;
                });
                
                tipoSelect.disabled = false;
            } else {
                tipoSelect.disabled = true;
            }
        });
    }

    // =====================================================
    // 📊 CARGA DE DATOS INICIAL
    // =====================================================
    async function loadInitialData() {
        try {
            console.log('📊 Cargando datos iniciales...');
            
            // Cargar productos con vista completa
            const { data: products, error: prodError } = await supabaseCliente
                .from('vista_productos_completa')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (prodError) throw prodError;
            
            currentProductsData = products || [];
            
            console.log(`✅ ${currentProductsData.length} productos cargados`);
            
            return {
                products: currentProductsData
            };
            
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            return { products: [] };
        }
    }

    // =====================================================
    // 🎨 RENDERIZADO DE UI
    // =====================================================
    function renderUI(data) {
        updateDashboardStats(data.products);
        renderProductsTable(data.products);
        setupMultipleImages();
        setupAIGenerator();
    }

    function updateDashboardStats(products) {
        const stats = {
            total: products.length,
            destacados: products.filter(p => p.destacado).length,
            categorias: new Set(products.map(p => p.categoria_nueva_nombre).filter(Boolean)).size
        };
        
        updateElement('total-products', stats.total);
        updateElement('total-destacados', stats.destacados);
        updateElement('total-categories', stats.categorias);
    }

    function updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function renderProductsTable(products) {
        const tbody = document.getElementById('products-table-body');
        if (!tbody) return;
        
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay productos disponibles</td></tr>';
            return;
        }
        
        tbody.innerHTML = products.map(product => `
            <tr>
                <td>
                    <img src="${product.imagen_url || (product.imagenes_json && product.imagenes_json[0]) || '/placeholder.jpg'}" 
                         alt="${product.nombre}" 
                         class="product-thumbnail"
                         onerror="this.src='/placeholder.jpg'">
                </td>
                <td>
                    <strong>${product.nombre}</strong>
                    ${product.destacado ? '<span class="badge-destacado">⭐ Destacado</span>' : ''}
                    ${product.generar_con_ia ? '<span class="badge-ia">🤖 IA</span>' : ''}
                </td>
                <td>${product.categoria_nueva_nombre || product.categoria || 'Sin categoría'}</td>
                <td>${product.tipo_producto_nombre || '-'}</td>
                <td>$${(product.precio || 0).toFixed(2)}</td>
                <td>
                    <span class="status-badge ${product.activo ? 'active' : 'inactive'}">
                        ${product.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="actions-cell">
                    <button class="btn-icon edit-product" data-id="${product.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon toggle-destacado" data-id="${product.id}" data-destacado="${product.destacado}" title="Destacar">
                        <i class="fas fa-star"></i>
                    </button>
                    <button class="btn-icon delete-product" data-id="${product.id}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Event listeners para botones
        tbody.querySelectorAll('.edit-product').forEach(btn => {
            btn.addEventListener('click', (e) => editProduct(parseInt(e.currentTarget.dataset.id)));
        });
        
        tbody.querySelectorAll('.toggle-destacado').forEach(btn => {
            btn.addEventListener('click', (e) => toggleDestacado(parseInt(e.currentTarget.dataset.id)));
        });
        
        tbody.querySelectorAll('.delete-product').forEach(btn => {
            btn.addEventListener('click', (e) => confirmDelete(parseInt(e.currentTarget.dataset.id)));
        });
    }

    // =====================================================
    // 🤖 GENERADOR DE PRODUCTOS CON IA
    // =====================================================
    function setupAIGenerator() {
        const aiButton = document.getElementById('ai-generate-btn');
        const aiTips = document.getElementById('ai-tips');
        
        if (aiButton) {
            aiButton.addEventListener('click', generateProductWithAI);
        }
        
        // Mostrar tips de IA
        if (aiTips) {
            aiTips.innerHTML = `
                <div class="ai-tips-content">
                    <h4>💡 Tips para la IA:</h4>
                    <ul>
                        <li>Describe el producto con detalles específicos</li>
                        <li>Menciona colores, materiales y ocasión de uso</li>
                        <li>Ejemplo: "Blusa elegante de seda azul para oficina"</li>
                        <li>La IA generará descripción y sugerirá categorías</li>
                    </ul>
                </div>
            `;
        }
    }

    async function generateProductWithAI() {
        const aiButton = document.getElementById('ai-generate-btn');
        const aiStatus = document.getElementById('ai-feedback');
        const nombreInput = document.getElementById('nombre');
        
        if (!nombreInput.value.trim()) {
            showAIStatus('error', 'Por favor, ingresa un nombre del producto para que la IA pueda trabajar');
            return;
        }
        
        try {
            // Cambiar estado del botón
            aiButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
            aiButton.disabled = true;
            
            showAIStatus('loading', 'La IA está analizando y generando contenido...');
            
            // Simular llamada a IA (puedes reemplazar con OpenAI API)
            const aiDescription = await generateDescriptionWithAI(nombreInput.value);
            
            // Llenar campos automáticamente
            document.getElementById('descripcion').value = aiDescription.descripcion;
            
            // Sugerir categoría
            if (aiDescription.categoria_sugerida) {
                suggestCategory(aiDescription.categoria_sugerida);
            }
            
            // Marcar como generado con IA
            document.getElementById('generar-con-ia').checked = true;
            
            showAIStatus('success', '¡Contenido generado exitosamente! Revisa y ajusta según necesites.');
            
        } catch (error) {
            console.error('Error generando con IA:', error);
            showAIStatus('error', 'Error al generar contenido. Intenta nuevamente.');
        } finally {
            aiButton.innerHTML = '<i class="fas fa-magic"></i> Generar con IA';
            aiButton.disabled = false;
        }
    }

    async function generateDescriptionWithAI(productName) {
        // Simulación de IA - puedes reemplazar con una API real como OpenAI
        return new Promise((resolve) => {
            setTimeout(() => {
                const templates = {
                    'blusa': {
                        descripcion: `Elegante blusa ${productName.toLowerCase()} confeccionada con materiales de alta calidad. Perfecta para ocasiones especiales y uso diario. Su diseño versátil la convierte en una pieza imprescindible en tu guardarropa. Disponible en diferentes tallas para un ajuste perfecto.`,
                        categoria_sugerida: 'Prendas de Vestir'
                    },
                    'vestido': {
                        descripcion: `Hermoso vestido ${productName.toLowerCase()} que combina estilo y comodidad. Su corte favorecedor se adapta a diferentes tipos de cuerpo. Ideal para eventos especiales o para lucir elegante en cualquier ocasión. Confeccionado con atención al detalle.`,
                        categoria_sugerida: 'Prendas de Vestir'
                    },
                    'cartera': {
                        descripcion: `Elegante cartera ${productName.toLowerCase()} diseñada para la mujer moderna. Amplio espacio interior con compartimentos organizadores. Perfecta combinación de funcionalidad y estilo. Material resistente y acabados de calidad premium.`,
                        categoria_sugerida: 'Bolsos y Carteras'
                    },
                    'collar': {
                        descripcion: `Hermoso collar ${productName.toLowerCase()} que añade un toque de elegancia a cualquier outfit. Diseño único que resalta tu personalidad. Perfecto para regalar o para consentirte. Materiales de calidad que garantizan durabilidad.`,
                        categoria_sugerida: 'Joyería'
                    }
                };
                
                // Detectar tipo de producto por palabras clave
                const detectedType = Object.keys(templates).find(key => 
                    productName.toLowerCase().includes(key)
                ) || 'blusa';
                
                resolve({
                    descripcion: templates[detectedType].descripcion,
                    categoria_sugerida: templates[detectedType].categoria_sugerida
                });
            }, 2000); // Simular delay de API
        });
    }

    function suggestCategory(categoryName) {
        const categorySelect = document.getElementById('categoria-nueva');
        if (!categorySelect) return;
        
        // Buscar categoría por nombre
        const category = categoriesData.categorias.find(cat => 
            cat.nombre.toLowerCase().includes(categoryName.toLowerCase())
        );
        
        if (category) {
            categorySelect.value = category.id;
            categorySelect.dispatchEvent(new Event('change')); // Trigger dependencias
            
            showAIStatus('info', `💡 Categoría sugerida: ${category.nombre}`);
        }
    }

    function showAIStatus(type, message) {
        const statusDiv = document.getElementById('ai-feedback');
        if (!statusDiv) return;
        
        statusDiv.className = `ai-status ${type}`;
        statusDiv.innerHTML = `
            <div class="status-content">
                ${type === 'loading' ? '<i class="fas fa-spinner fa-spin"></i>' : ''}
                ${type === 'success' ? '<i class="fas fa-check-circle"></i>' : ''}
                ${type === 'error' ? '<i class="fas fa-exclamation-circle"></i>' : ''}
                ${type === 'info' ? '<i class="fas fa-info-circle"></i>' : ''}
                <span>${message}</span>
            </div>
        `;
        statusDiv.style.display = 'block';
        
        // Auto-hide después de 10 segundos
        if (type !== 'loading') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 10000);
        }
    }

    // =====================================================
    // 🖼️ SISTEMA DE MÚLTIPLES IMÁGENES
    // =====================================================
    function setupMultipleImages() {
        const uploadArea = document.getElementById('image-upload-area');
        const imageInput = document.getElementById('imagenes');
        
        if (!uploadArea || !imageInput) return;
        
        uploadArea.addEventListener('click', () => imageInput.click());
        uploadArea.addEventListener('dragover', handleImageDragOver);
        uploadArea.addEventListener('drop', handleImageDrop);
        imageInput.addEventListener('change', (e) => handleImageFiles(e.target.files));
    }

    function handleImageDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('drag-over');
    }

    function handleImageDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');
        handleImageFiles(e.dataTransfer.files);
    }

    async function handleImageFiles(files) {
        const preview = document.getElementById('images-preview');
        if (!preview) return;
        
        for (let file of files) {
            if (!file.type.startsWith('image/')) continue;
            
            const imageData = {
                id: ++imageCounter,
                file: file,
                preview: URL.createObjectURL(file),
                isMain: selectedImages.length === 0 // Primera imagen es principal
            };
            
            selectedImages.push(imageData);
            renderImagePreview(imageData);
        }
        
        updateImageControls();
    }

    function renderImagePreview(imageData) {
        const preview = document.getElementById('images-preview');
        const imageDiv = document.createElement('div');
        imageDiv.className = 'image-preview-item';
        imageDiv.dataset.imageId = imageData.id;
        
        imageDiv.innerHTML = `
            <img src="${imageData.preview}" alt="Preview">
            <div class="image-controls">
                <button type="button" class="btn-small ${imageData.isMain ? 'btn-primary' : 'btn-secondary'}" 
                        onclick="setMainImage(${imageData.id})">
                    ${imageData.isMain ? '⭐ Principal' : 'Hacer Principal'}
                </button>
                <button type="button" class="btn-small btn-danger" onclick="removeImage(${imageData.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            ${imageData.isMain ? '<div class="main-badge">Principal</div>' : ''}
        `;
        
        preview.appendChild(imageDiv);
    }

    window.setMainImage = function(imageId) {
        selectedImages.forEach(img => img.isMain = img.id === imageId);
        refreshImagePreviews();
    };

    window.removeImage = function(imageId) {
        selectedImages = selectedImages.filter(img => img.id !== imageId);
        
        // Si se eliminó la imagen principal, hacer principal la primera
        if (selectedImages.length > 0 && !selectedImages.some(img => img.isMain)) {
            selectedImages[0].isMain = true;
        }
        
        refreshImagePreviews();
    };

    function refreshImagePreviews() {
        const preview = document.getElementById('images-preview');
        preview.innerHTML = '';
        selectedImages.forEach(imageData => renderImagePreview(imageData));
    }

    function updateImageControls() {
        const uploadArea = document.getElementById('image-upload-area');
        const counter = document.querySelector('.images-counter') || createImagesCounter();
        
        counter.textContent = `${selectedImages.length} imagen(es) seleccionada(s)`;
        
        if (selectedImages.length > 0) {
            uploadArea.classList.add('has-images');
        } else {
            uploadArea.classList.remove('has-images');
        }
    }

    function createImagesCounter() {
        const counter = document.createElement('div');
        counter.className = 'images-counter';
        document.getElementById('image-upload-area').parentNode.appendChild(counter);
        return counter;
    }

    // =====================================================
    // 📝 MANEJO DE FORMULARIOS
    // =====================================================
    function setupEventListeners(products) {
        const productForm = document.getElementById('product-form');
        const searchInput = document.getElementById('search-products');
        const logoutButton = document.getElementById('logout-button');
        
        if (productForm) {
            productForm.addEventListener('submit', (e) => handleProductFormSubmit(e, products));
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => filterProducts(e.target.value));
        }
        
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                if (confirm('¿Estás seguro de cerrar sesión?')) {
                    await supabaseCliente.auth.signOut();
                    window.location.href = '/login.html';
                }
            });
        }
        
        // Navegación
        setupNavigation();
        setupMobileMenu();
    }

    async function handleProductFormSubmit(e, products) {
        e.preventDefault();
        
        const submitButton = document.getElementById('submit-button');
        const originalText = submitButton.textContent;
        
        try {
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            submitButton.disabled = true;
            
            // Recopilar datos del formulario
            const formData = new FormData(e.target);
            const productData = {
                nombre: formData.get('nombre'),
                descripcion: formData.get('descripcion'),
                precio: parseFloat(formData.get('precio')),
                categoria_nueva_id: formData.get('categoria-nueva') || null,
                tipo_producto_id: formData.get('tipo-producto') || null,
                material_id: formData.get('material') || null,
                destacado: formData.has('destacado'),
                generar_con_ia: formData.has('generar-con-ia'),
                activo: true
            };
            
            // Recopilar colores seleccionados
            const selectedColors = [];
            document.querySelectorAll('#colores-grid input[type="checkbox"]:checked').forEach(checkbox => {
                selectedColors.push(checkbox.value);
            });
            productData.colores_disponibles = selectedColors;
            
            // Recopilar tallas
            const tallas = formData.get('tallas');
            if (tallas) {
                productData.tallas_disponibles = tallas.split(',').map(t => t.trim()).filter(t => t);
            }
            
            // Subir imágenes
            const imageUrls = await uploadProductImages();
            if (imageUrls.length > 0) {
                productData.imagenes_urls = imageUrls;
                productData.imagen_url = imageUrls[0]; // Mantener compatibilidad
            }
            
            // Guardar producto
            let result;
            if (editingProductId) {
                result = await supabaseCliente
                    .from('productos')
                    .update(productData)
                    .eq('id', editingProductId);
            } else {
                result = await supabaseCliente
                    .from('productos')
                    .insert([productData]);
            }
            
            if (result.error) throw result.error;
            
            // Recargar datos
            const newData = await loadInitialData();
            renderUI(newData);
            
            // Resetear formulario
            resetProductForm();
            
            alert(editingProductId ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente');
            
        } catch (error) {
            console.error('Error guardando producto:', error);
            alert('Error al guardar el producto: ' + error.message);
        } finally {
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    }

    async function uploadProductImages() {
        const uploadedUrls = [];
        
        for (let imageData of selectedImages) {
            try {
                const fileName = `productos/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
                
                const { data, error } = await supabaseCliente.storage
                    .from('productos')
                    .upload(fileName, imageData.file);
                
                if (error) throw error;
                
                const { data: urlData } = supabaseCliente.storage
                    .from('productos')
                    .getPublicUrl(fileName);
                
                uploadedUrls.push(urlData.publicUrl);
                
            } catch (error) {
                console.error('Error subiendo imagen:', error);
            }
        }
        
        return uploadedUrls;
    }

    function resetProductForm() {
        document.getElementById('product-form').reset();
        selectedImages = [];
        imageCounter = 0;
        editingProductId = null;
        
        document.getElementById('images-preview').innerHTML = '';
        document.getElementById('form-title').textContent = 'Nuevo Producto';
        document.getElementById('submit-button').textContent = 'Crear Producto';
        
        // Resetear colores
        document.querySelectorAll('#colores-grid input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        updateSelectedColors();
        updateImageControls();
    }

    // =====================================================
    // 🔧 FUNCIONES ADICIONALES
    // =====================================================
    async function editProduct(productId) {
        try {
            const { data: product, error } = await supabaseCliente
                .from('vista_productos_completa')
                .select('*')
                .eq('id', productId)
                .single();
            
            if (error) throw error;
            
            // Llenar formulario
            document.getElementById('nombre').value = product.nombre || '';
            document.getElementById('descripcion').value = product.descripcion || '';
            document.getElementById('precio').value = product.precio || '';
            document.getElementById('categoria-nueva').value = product.categoria_nueva_id || '';
            document.getElementById('tipo-producto').value = product.tipo_producto_id || '';
            document.getElementById('material').value = product.material_id || '';
            document.getElementById('destacado').checked = product.destacado || false;
            document.getElementById('generar-con-ia').checked = product.generar_con_ia || false;
            
            // Trigger categorías para cargar tipos
            if (product.categoria_nueva_id) {
                document.getElementById('categoria-nueva').dispatchEvent(new Event('change'));
                setTimeout(() => {
                    document.getElementById('tipo-producto').value = product.tipo_producto_id || '';
                }, 100);
            }
            
            // Tallas
            if (product.tallas_disponibles) {
                document.getElementById('tallas').value = Array.isArray(product.tallas_disponibles) ? 
                    product.tallas_disponibles.join(', ') : product.tallas_disponibles;
            }
            
            // Colores
            if (product.colores_disponibles) {
                const colores = Array.isArray(product.colores_disponibles) ? 
                    product.colores_disponibles : JSON.parse(product.colores_disponibles || '[]');
                
                document.querySelectorAll('#colores-grid input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = colores.includes(checkbox.value);
                });
                updateSelectedColors();
            }
            
            editingProductId = productId;
            document.getElementById('form-title').textContent = 'Editar Producto';
            document.getElementById('submit-button').textContent = 'Actualizar Producto';
            
            // Scroll al formulario
            document.getElementById('new-product').scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Error cargando producto:', error);
            alert('Error al cargar el producto');
        }
    }

    async function toggleDestacado(productId) {
        try {
            const product = currentProductsData.find(p => p.id === productId);
            if (!product) return;
            
            const { error } = await supabaseCliente
                .from('productos')
                .update({ destacado: !product.destacado })
                .eq('id', productId);
            
            if (error) throw error;
            
            // Recargar datos
            const newData = await loadInitialData();
            renderUI(newData);
            
        } catch (error) {
            console.error('Error actualizando destacado:', error);
            alert('Error al actualizar el producto');
        }
    }

    async function confirmDelete(productId) {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;
        
        try {
            const { error } = await supabaseCliente
                .from('productos')
                .delete()
                .eq('id', productId);
            
            if (error) throw error;
            
            // Recargar datos
            const newData = await loadInitialData();
            renderUI(newData);
            
            alert('Producto eliminado exitosamente');
            
        } catch (error) {
            console.error('Error eliminando producto:', error);
            alert('Error al eliminar el producto');
        }
    }

    function filterProducts(searchTerm) {
        const filteredProducts = currentProductsData.filter(product =>
            product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.descripcion && product.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (product.categoria_nueva_nombre && product.categoria_nueva_nombre.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        renderProductsTable(filteredProducts);
    }

    function setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.admin-section');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = item.dataset.section;
                
                // Actualizar navegación activa
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Mostrar sección correspondiente
                sections.forEach(section => {
                    section.style.display = section.id === targetSection ? 'block' : 'none';
                });
            });
        });
    }

    function setupMobileMenu() {
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.querySelector('.admin-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (menuToggle && sidebar && overlay) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
                overlay.classList.toggle('active');
            });
            
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
        }
    }

    function loadFallbackCategories() {
        categoriesData = {
            categorias: [
                { id: 1, nombre: 'Prendas de Vestir' },
                { id: 2, nombre: 'Accesorios' },
                { id: 3, nombre: 'Calzado' },
                { id: 4, nombre: 'Bolsos y Carteras' },
                { id: 5, nombre: 'Joyería' }
            ],
            tipos: [],
            materiales: [
                { id: 1, nombre: 'Algodón' },
                { id: 2, nombre: 'Poliéster' },
                { id: 3, nombre: 'Seda' }
            ],
            colores: [
                { id: 1, nombre: 'Negro', codigo_hex: '#000000' },
                { id: 2, nombre: 'Blanco', codigo_hex: '#FFFFFF' },
                { id: 3, nombre: 'Rojo', codigo_hex: '#FF0000' }
            ]
        };
        
        populateSelects();
        console.log('📋 Datos de categorización fallback cargados');
    }
});

console.log('🌟 Emprendedoras de Acero - Admin con IA cargado exitosamente');