import supabase from "https://esm.sh/supabase-js"

const SUPABASE_URL = "https://sliqaezclxbvlxwbqpjp.supabase.co" // <-- ¡Pega tu URL aquí!
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXFhZXpjbHhidmx4d2JxcGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTQwNzYsImV4cCI6MjA3MDg5MDA3Nn0.inNhc24bE0E6B9UOBnSBc0_sxsPrTX4JRaynET68Lsk" // <-- ¡Pega tu clave anónima aquí!

const supabaseCliente = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Lógica del carrito (reutilizable)
const cartButton = document.getElementById("cart-button")
const cartCount = document.getElementById("cart-count")
const cart = JSON.parse(localStorage.getItem("cart")) || []

function updateCartCount() {
  cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0)
}

// --- Lógica de la Página de Producto ---
async function loadProduct() {
  const productDetailContainer = document.getElementById("product-detail")

  // Obtenemos el ID del producto desde la URL (ej: producto.html?id=5)
  const urlParams = new URLSearchParams(window.location.search)
  const productId = urlParams.get("id")

  if (!productId) {
    productDetailContainer.innerHTML = "<p>Producto no encontrado.</p>"
    return
  }

  const { data: product, error } = await supabaseCliente.from("productos").select("*").eq("id", productId).single() // .single() nos trae un solo resultado en vez de un array

  if (error || !product) {
    console.error("Error cargando el producto:", error)
    productDetailContainer.innerHTML = "<p>Error al cargar el producto.</p>"
    return
  }

  // Cambiamos el título de la página
  document.title = `${product.nombre} - Emprendedoras de Acero`

  // Dibujamos el HTML del producto
  productDetailContainer.innerHTML = `
        <div class="product-detail-container">
            <div class="product-image-gallery">
                <img src="${product.imagen_url}" alt="${product.nombre}">
            </div>
            <div class="product-info">
                <span class="category">${product.categoria}</span>
                <h1>${product.nombre}</h1>
                <p>${product.descripcion}</p>
                <div class="stock">Disponibles: ${product.stock}</div>
                <div class="price">$${product.precio}</div>
                <button class="btn" id="add-to-cart-button">Añadir al Carrito</button>
            </div>
        </div>
    `

  // Añadimos la lógica al botón "Añadir al Carrito"
  document.getElementById("add-to-cart-button").addEventListener("click", () => {
    addToCart(product)
  })
}

function addToCart(product) {
  const existingProduct = cart.find((item) => item.id === product.id)
  if (existingProduct) {
    existingProduct.quantity++
  } else {
    cart.push({ ...product, quantity: 1 })
  }
  localStorage.setItem("cart", JSON.stringify(cart))
  updateCartCount()
  alert("¡Producto añadido al carrito!")
}

document.addEventListener("DOMContentLoaded", () => {
  loadProduct()
  updateCartCount()
  // Aquí también necesitarías la lógica para abrir/cerrar el modal y finalizar la compra
})
