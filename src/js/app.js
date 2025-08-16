const SUPABASE_URL = "https://sliqaezclxbvlxwbqpjp.supabase.co" // <-- ¡Pega tu URL aquí!
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXFhZXpjbHhidmx4d2JxcGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTQwNzYsImV4cCI6MjA3MDg5MDA3Nn0.inNhc24bE0E6B9UOBnSBc0_sxsPrTX4JRaynET68Lsk" // <-- ¡Pega tu clave anónima aquí!

const supabase = window.supabase
const supabaseCliente = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let cart = JSON.parse(localStorage.getItem("cart")) || []

async function cargarProductos(categoria = "all") {
  const grid = document.getElementById("product-grid")
  if (!grid) return

  grid.innerHTML = '<div class="loading">Cargando productos...</div>'

  const { data, error } = await supabaseCliente.from("productos").select("*").order("created_at", { ascending: false })

  if (error || !data || data.length === 0) {
    grid.innerHTML = '<p class="text-center">Aún no hay productos para mostrar. ¡Vuelve pronto!</p>'
    console.error("Error al cargar productos:", error)
    return
  }

  const productosFiltrados =
    categoria === "all" ? data : data.filter((producto) => producto.categoria.toLowerCase() === categoria.toLowerCase())

  if (productosFiltrados.length === 0) {
    grid.innerHTML = '<p class="text-center">No hay productos en esta categoría.</p>'
    return
  }

  grid.innerHTML = productosFiltrados
    .map((producto) => {
      const stockClass = producto.stock > 10 ? "in-stock" : producto.stock > 0 ? "low-stock" : "out-of-stock"
      const stockText = producto.stock > 0 ? `Stock: ${producto.stock}` : "Sin stock"
      const stockIcon = producto.stock > 0 ? "✓" : "✗"

      return `
            <div class="product-card fade-in" data-categoria="${producto.categoria.toLowerCase()}">
                <img src="${producto.imagen_url}" alt="${producto.nombre}" loading="lazy">
                <div class="product-card-content">
                    <div class="category">${producto.categoria}</div>
                    <h3>${producto.nombre}</h3>
                    <p>${producto.descripcion}</p>
                    <div class="stock ${stockClass}">
                        <span>${stockIcon}</span>
                        ${stockText}
                    </div>
                    <div class="price">$${producto.precio}</div>
                    <div class="product-actions">
                        <button class="btn btn-add-cart" onclick="agregarAlCarrito(${producto.id}, '${producto.nombre}', ${producto.precio}, '${producto.imagen_url}')" ${producto.stock === 0 ? "disabled" : ""}>
                            <i class="fas fa-cart-plus"></i>
                            ${producto.stock === 0 ? "Sin Stock" : "Agregar"}
                        </button>
                        <button class="btn btn-whatsapp" onclick="contactarWhatsApp('${producto.nombre}', ${producto.precio})">
                            <i class="fab fa-whatsapp"></i>
                            Consultar
                        </button>
                    </div>
                </div>
            </div>
        `
    })
    .join("")
}

function agregarAlCarrito(id, nombre, precio, imagen) {
  const itemExistente = cart.find((item) => item.id === id)

  if (itemExistente) {
    itemExistente.cantidad += 1
  } else {
    cart.push({
      id: id,
      nombre: nombre,
      precio: precio,
      imagen: imagen,
      cantidad: 1,
    })
  }

  actualizarCarrito()
  mostrarNotificacion(`${nombre} agregado al carrito`)
}

function eliminarDelCarrito(id) {
  cart = cart.filter((item) => item.id !== id)
  actualizarCarrito()
}

function actualizarCantidad(id, nuevaCantidad) {
  const item = cart.find((item) => item.id === id)
  if (item) {
    item.cantidad = Math.max(1, nuevaCantidad)
    actualizarCarrito()
  }
}

function actualizarCarrito() {
  localStorage.setItem("cart", JSON.stringify(cart))

  const cartCount = document.getElementById("cart-count")
  if (cartCount) {
    const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0)
    cartCount.textContent = totalItems
  }

  actualizarModalCarrito()
}

function actualizarModalCarrito() {
  const cartItems = document.getElementById("cart-items")
  const cartTotal = document.getElementById("cart-total")

  if (!cartItems || !cartTotal) return

  if (cart.length === 0) {
    cartItems.innerHTML = '<p class="text-center">Tu carrito está vacío</p>'
    cartTotal.textContent = "0"
    return
  }

  cartItems.innerHTML = cart
    .map(
      (item) => `
        <div class="cart-item">
            <img src="${item.imagen}" alt="${item.nombre}">
            <div class="cart-item-info">
                <h4>${item.nombre}</h4>
                <p>Cantidad: 
                    <button onclick="actualizarCantidad(${item.id}, ${item.cantidad - 1})" class="btn-quantity">-</button>
                    ${item.cantidad}
                    <button onclick="actualizarCantidad(${item.id}, ${item.cantidad + 1})" class="btn-quantity">+</button>
                </p>
            </div>
            <div class="cart-item-price">$${(item.precio * item.cantidad).toFixed(2)}</div>
            <button onclick="eliminarDelCarrito(${item.id})" class="btn btn-delete" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `,
    )
    .join("")

  const total = cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
  cartTotal.textContent = total.toFixed(2)
}

function contactarWhatsApp(nombreProducto, precio) {
  const telefono = "59292190483" // Número de WhatsApp
  const mensaje = `Hola! Me interesa el producto: ${nombreProducto} - Precio: $${precio}. ¿Podrías darme más información?`
  const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
  window.open(url, "_blank")
}

function finalizarCompraWhatsApp() {
  if (cart.length === 0) {
    alert("Tu carrito está vacío")
    return
  }

  const telefono = "59292190483"
  let mensaje = "Hola! Quiero realizar el siguiente pedido:\n\n"

  cart.forEach((item) => {
    mensaje += `• ${item.nombre} x${item.cantidad} - $${(item.precio * item.cantidad).toFixed(2)}\n`
  })

  const total = cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
  mensaje += `\nTotal: $${total.toFixed(2)}\n\n¿Podrían confirmarme la disponibilidad y el método de pago?`

  const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
  window.open(url, "_blank")
}

function mostrarNotificacion(mensaje) {
  const notificacion = document.createElement("div")
  notificacion.className = "notification"
  notificacion.textContent = mensaje
  notificacion.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background-color: var(--color-primary);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        z-index: 3000;
        animation: slideIn 0.3s ease-out;
    `

  document.body.appendChild(notificacion)

  setTimeout(() => {
    notificacion.style.animation = "slideOut 0.3s ease-out"
    setTimeout(() => {
      document.body.removeChild(notificacion)
    }, 300)
  }, 3000)
}

document.addEventListener("DOMContentLoaded", () => {
  cargarProductos()
  actualizarCarrito()

  const filterButtons = document.querySelectorAll(".filter-btn")
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((btn) => btn.classList.remove("active"))
      button.classList.add("active")

      const categoria = button.getAttribute("data-category")
      cargarProductos(categoria)
    })
  })

  const cartBtn = document.getElementById("cart-btn")
  const cartModal = document.getElementById("cart-modal")
  const closeCart = document.getElementById("close-cart")
  const checkoutBtn = document.getElementById("checkout-btn")

  if (cartBtn) {
    cartBtn.addEventListener("click", () => {
      cartModal.classList.add("active")
    })
  }

  if (closeCart) {
    closeCart.addEventListener("click", () => {
      cartModal.classList.remove("active")
    })
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", finalizarCompraWhatsApp)
  }

  if (cartModal) {
    cartModal.addEventListener("click", (e) => {
      if (e.target === cartModal) {
        cartModal.classList.remove("active")
      }
    })
  }

  const navLinks = document.querySelectorAll(".nav-link")
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault()
      const targetId = link.getAttribute("href")
      const targetSection = document.querySelector(targetId)
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: "smooth" })
      }
    })
  })

  const contactForm = document.getElementById("contact-form")
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault()
      const formData = new FormData(contactForm)
      const nombre = formData.get("nombre") || contactForm.querySelector('input[type="text"]').value
      const email = formData.get("email") || contactForm.querySelector('input[type="email"]').value
      const mensaje = formData.get("mensaje") || contactForm.querySelector("textarea").value

      const telefono = "59292190483"
      const whatsappMessage = `Hola! Soy ${nombre} (${email}). ${mensaje}`
      const url = `https://wa.me/${telefono}?text=${encodeURIComponent(whatsappMessage)}`
      window.open(url, "_blank")

      contactForm.reset()
      mostrarNotificacion("Mensaje enviado. Te redirigimos a WhatsApp.")
    })
  }
})

const style = document.createElement("style")
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .btn-quantity {
        background-color: var(--color-primary);
        color: white;
        border: none;
        width: 25px;
        height: 25px;
        border-radius: 50%;
        cursor: pointer;
        margin: 0 0.25rem;
        font-size: 0.8rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    
    .btn-quantity:hover {
        background-color: var(--color-accent);
    }
`
document.head.appendChild(style)
