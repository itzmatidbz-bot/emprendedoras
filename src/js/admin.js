// admin.js
const SUPABASE_URL = 'https://sliqaezclxbvlxwbqpjp.supabase.co'; // <-- ¡Pega tu URL aquí!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXFhZXpjbHhidmx4d2JxcGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTQwNzYsImV4cCI6MjA3MDg5MDA3Nn0.inNhc24bE0E6B9UOBnSBc0_sxsPrTX4JRaynET68Lsk'; // <-- ¡Pega tu clave anónima aquí!

const supabaseCliente = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Elementos del DOM ---
// ... (mismos elementos que en la versión anterior) ...
const productList = document.getElementById('product-list'); // Nuevo

// --- Lógica Principal ---
document.addEventListener('DOMContentLoaded', async () => {
    // ... (misma lógica de checkUserSession y setupImageUpload) ...
    await loadProductsForAdmin();
});

// ... (mismas funciones de checkUserSession, logout, setupImageUpload) ...

// --- CRUD: READ (Leer y mostrar productos en el admin) ---
async function loadProductsForAdmin() {
    const { data, error } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
    if (error) { console.error("Error cargando productos:", error); return; }
    
    productList.innerHTML = data.map(product => `
        <tr>
            <td><img src="${product.imagen_url}" alt="${product.nombre}"></td>
            <td>${product.nombre}</td>
            <td>$${product.precio}</td>
            <td>${product.stock}</td>
            <td class="actions">
                <button class="btn" onclick='editProduct(${JSON.stringify(product)})'>Editar</button>
                <button class="btn btn-danger" onclick="deleteProduct(${product.id})">Borrar</button>
            </td>
        </tr>
    `).join('');
}

// --- CRUD: CREATE / UPDATE ---
productForm.addEventListener('submit', async (e) => {
    // ... (misma lógica para subir imagen y obtener datos) ...
    
    const productId = document.getElementById('product-id').value;
    let response;

    if (productId) { // Si hay un ID, actualizamos
        response = await supabase.from('productos').update(productData).eq('id', productId);
    } else { // Si no, insertamos
        response = await supabase.from('productos').insert([productData]);
    }

    // ... (misma lógica de feedback al usuario y recargar lista) ...
    await loadProductsForAdmin();
});

// --- CRUD: DELETE ---
async function deleteProduct(id) {
    if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) return;
    
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) {
        alert("Error al eliminar el producto: " + error.message);
    } else {
        alert("Producto eliminado con éxito.");
        await loadProductsForAdmin();
    }
}

// --- Lógica para Editar ---
function editProduct(product) {
    // ... (misma lógica para rellenar el formulario) ...
}

// ... Y el resto del código de admin.js ...