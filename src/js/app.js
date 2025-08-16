const SUPABASE_URL = 'https://sliqaezclxbvlxwbqpjp.supabase.co'; // <-- ¡Pega tu URL aquí!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXFhZXpjbHhidmx4d2JxcGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTQwNzYsImV4cCI6MjA3MDg5MDA3Nn0.inNhc24bE0E6B9UOBnSBc0_sxsPrTX4JRaynET68Lsk'; // <-- ¡Pega tu clave anónima aquí!

const supabaseCliente = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cargarProductos() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    
    grid.innerHTML = '<p>Cargando productos...</p>';

    const { data, error } = await supabaseCliente
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error || data.length === 0) {
        grid.innerHTML = '<p>Aún no hay productos para mostrar. ¡Vuelve pronto!</p>';
        console.error('Error al cargar productos:', error);
        return;
    }

    grid.innerHTML = data.map(producto => `
        <div class="product-card">
            <img src="${producto.imagen_url}" alt="${producto.nombre}" loading="lazy">
            <div class="product-card-content">
                <div class="category">${producto.categoria}</div>
                <h3>${producto.nombre}</h3>
                <p>${producto.descripcion}</p>
                <div class="stock">Stock: ${producto.stock}</div>
                <div class="price">$${producto.precio}</div>
            </div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
});
// CORREGIDO: Se eliminó una llave "}" extra que había aquí