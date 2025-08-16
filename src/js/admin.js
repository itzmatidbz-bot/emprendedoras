// admin.js
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