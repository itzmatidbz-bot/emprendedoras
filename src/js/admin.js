const SUPABASE_URL = 'https://sliqaezclxbvlxwbqpjp.supabase.co'; // <-- ¡Pega tu URL aquí!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXFhZXpjbHhidmx4d2JxcGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTQwNzYsImV4cCI6MjA3MDg5MDA3Nn0.inNhc24bE0E6B9UOBnSBc0_sxsPrTX4JRaynET68Lsk'; // <-- ¡Pega tu clave anónima aquí!

const supabaseCliente = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Elementos del DOM ---
const logoutButton = document.getElementById('logout-button');
const productForm = document.getElementById('product-form');
const submitButton = document.getElementById('submit-button');
const imageUploadArea = document.getElementById('image-upload-area');
const imageInput = document.getElementById('imagen');
const imagePreview = document.getElementById('image-preview');
const productListBody = document.getElementById('product-list-body');
const formTitle = document.getElementById('form-title');
const productIdInput = document.getElementById('product-id');
const cancelEditButton = document.getElementById('cancel-edit-button');

// --- Lógica Principal ---
document.addEventListener('DOMContentLoaded', () => {
    checkUserSession();
    setupImageUpload();
    loadProductsForAdmin();
});

// --- AUTENTICACIÓN ---
async function checkUserSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) window.location.href = '/login.html';
}

logoutButton.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/login.html';
});

// --- SUBIDA DE IMÁGENES ---
function setupImageUpload() {
    imageUploadArea.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', (e) => handleFiles(e.target.files));
    imageUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); });
    imageUploadArea.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files); });
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

// --- CRUD: READ (Leer y mostrar productos) ---
async function loadProductsForAdmin() {
    const { data, error } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
    if (error) { console.error("Error cargando productos:", error); return; }
    
    productListBody.innerHTML = data.map(product => `
        <tr>
            <td><img src="${product.imagen_url}" alt="${product.nombre}"></td>
            <td>${product.nombre}</td>
            <td>$${product.precio}</td>
            <td>${product.stock}</td>
            <td class="actions">
                <button class="btn" onclick='editProduct(${JSON.stringify(product)})'>Editar</button>
                <button class="btn btn-danger" onclick="deleteProduct(${product.id}, '${product.imagen_url}')">Borrar</button>
            </td>
        </tr>
    `).join('');
}

// --- CRUD: CREATE / UPDATE ---
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'Guardando...';

    const productData = {
        nombre: document.getElementById('nombre').value,
        descripcion: document.getElementById('descripcion').value,
        precio: parseFloat(document.getElementById('precio').value),
        stock: parseInt(document.getElementById('stock').value),
        categoria: document.getElementById('categoria').value,
    };
    
    const file = imageInput.files[0];
    const productId = productIdInput.value;

    // Si estamos editando y no se sube una nueva imagen, mantenemos la anterior
    if (productId && !file) {
        productData.imagen_url = imagePreview.src;
    } else if (file) {
        // Subir la nueva imagen
        const filePath = `public/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('productos').upload(filePath, file);

        if (uploadError) {
            alert('Error al subir la imagen: ' + uploadError.message);
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar Producto';
            return;
        }
        
        const { data: urlData } = supabase.storage.from('productos').getPublicUrl(uploadData.path);
        productData.imagen_url = urlData.publicUrl;
    }

    // Guardar en la base de datos
    let response;
    if (productId) {
        response = await supabase.from('productos').update(productData).eq('id', productId);
    } else {
        response = await supabase.from('productos').insert([productData]);
    }

    if (response.error) {
        alert('Error al guardar el producto: ' + response.error.message);
    } else {
        alert('¡Producto guardado con éxito!');
        resetForm();
        await loadProductsForAdmin();
    }
    
    submitButton.disabled = false;
    submitButton.textContent = 'Guardar Producto';
});

// --- CRUD: DELETE ---
async function deleteProduct(id, imageUrl) {
    if (!confirm("¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.")) return;
    
    // 1. Borrar el producto de la base de datos
    const { error: dbError } = await supabase.from('productos').delete().eq('id', id);
    if (dbError) {
        alert("Error al eliminar el producto de la base de datos: " + dbError.message);
        return;
    }

    // 2. Borrar la imagen del Storage
    if (imageUrl) {
        const imagePath = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
        const { error: storageError } = await supabase.storage.from('productos').remove([`public/${imagePath}`]);
        if (storageError) {
            alert("El producto fue borrado de la base de datos, pero hubo un error al borrar la imagen del almacenamiento.");
        }
    }

    alert("Producto eliminado con éxito.");
    await loadProductsForAdmin();
}

// --- Funciones de Ayuda para el Formulario ---
function editProduct(product) {
    formTitle.textContent = "Editar Producto";
    productIdInput.value = product.id;
    document.getElementById('nombre').value = product.nombre;
    document.getElementById('descripcion').value = product.descripcion;
    document.getElementById('precio').value = product.precio;
    document.getElementById('stock').value = product.stock;
    document.getElementById('categoria').value = product.categoria;
    imagePreview.src = product.imagen_url;
    
    cancelEditButton.style.display = 'inline-block';
    window.scrollTo(0, 0);
}

function resetForm() {
    formTitle.textContent = "Añadir Nuevo Producto";
    productForm.reset();
    productIdInput.value = '';
    imagePreview.src = '';
    cancelEditButton.style.display = 'none';
}

cancelEditButton.addEventListener('click', resetForm);