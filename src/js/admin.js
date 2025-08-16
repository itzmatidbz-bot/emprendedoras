// Import Supabase client
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js"

const SUPABASE_URL = "https://sliqaezclxbvlxwbqpjp.supabase.co" // <-- ¡Pega tu URL aquí!
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXFhZXpjbHhidmx4d2JxcGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTQwNzYsImV4cCI6MjA3MDg5MDA3Nn0.inNhc24bE0E6B9UOBnSBc0_sxsPrTX4JRaynET68Lsk" // <-- ¡Pega tu clave anónima aquí!

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const supabaseCliente = supabase

// --- Elementos del DOM ---
const logoutButton = document.getElementById("logout-button")
const productForm = document.getElementById("product-form")
const submitButton = document.getElementById("submit-button")
const imageUploadArea = document.getElementById("image-upload-area")
const imageInput = document.getElementById("imagen")
const imagePreview = document.getElementById("image-preview")

let productosActuales = []
let productoEditando = null

// --- Lógica Principal ---
document.addEventListener("DOMContentLoaded", () => {
  checkUserSession()
  setupImageUpload()
  cargarProductosAdmin()

  // Botón de actualizar productos
  const refreshBtn = document.getElementById("refresh-products")
  if (refreshBtn) {
    refreshBtn.addEventListener("click", cargarProductosAdmin)
  }

  // Búsqueda de productos
  const searchInput = document.getElementById("search-products")
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      buscarProductos(e.target.value)
    })
  }

  // Modal de edición
  const editModal = document.getElementById("edit-modal")
  const closeEditModal = document.getElementById("close-edit-modal")
  const cancelEdit = document.getElementById("cancel-edit")

  if (closeEditModal) {
    closeEditModal.addEventListener("click", () => {
      editModal.classList.remove("active")
    })
  }

  if (cancelEdit) {
    cancelEdit.addEventListener("click", () => {
      editModal.classList.remove("active")
    })
  }

  // Cerrar modal al hacer click fuera
  if (editModal) {
    editModal.addEventListener("click", (e) => {
      if (e.target === editModal) {
        editModal.classList.remove("active")
      }
    })
  }

  // Configurar upload de imagen para edición
  const editImagePreview = document.getElementById("edit-image-preview")
  const editImageInput = document.getElementById("edit-imagen")

  if (editImagePreview) {
    editImagePreview.addEventListener("click", () => {
      editImageInput.click()
    })
  }

  if (editImageInput) {
    editImageInput.addEventListener("change", (e) => {
      const file = e.target.files[0]
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          editImagePreview.src = e.target.result
          editImagePreview.style.display = "block"
        }
        reader.readAsDataURL(file)
      }
    })
  }

  // Formulario de edición
  const editForm = document.getElementById("edit-product-form")
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      await actualizarProducto()
    })
  }
})

// Proteger la página
async function checkUserSession() {
  const {
    data: { session },
  } = await supabaseCliente.auth.getSession()
  if (!session) {
    window.location.href = "/login.html"
  }
}

// Cerrar sesión
logoutButton.addEventListener("click", async () => {
  await supabaseCliente.auth.signOut()
  window.location.href = "/login.html"
})

// Lógica para subir y previsualizar imágenes
function setupImageUpload() {
  imageUploadArea.addEventListener("click", () => imageInput.click())
  imageInput.addEventListener("change", (e) => handleFiles(e.target.files))
  imageUploadArea.addEventListener("dragover", (e) => {
    e.preventDefault()
    e.stopPropagation()
    imageUploadArea.style.borderColor = "var(--color-primary)"
    imageUploadArea.style.backgroundColor = "rgba(232, 160, 191, 0.1)"
  })
  imageUploadArea.addEventListener("dragleave", (e) => {
    e.preventDefault()
    e.stopPropagation()
    imageUploadArea.style.borderColor = "var(--color-primary)"
    imageUploadArea.style.backgroundColor = "var(--color-secondary)"
  })
  imageUploadArea.addEventListener("drop", (e) => {
    e.preventDefault()
    e.stopPropagation()
    imageUploadArea.style.borderColor = "var(--color-primary)"
    imageUploadArea.style.backgroundColor = "var(--color-secondary)"
    handleFiles(e.dataTransfer.files)
  })
}

function handleFiles(files) {
  const file = files[0]
  if (file && file.type.startsWith("image/")) {
    imageInput.files = files
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.src = e.target.result
      imagePreview.style.display = "block"
    }
    reader.readAsDataURL(file)
  }
}

async function cargarProductosAdmin() {
  const productsList = document.getElementById("products-list")
  if (!productsList) return

  productsList.innerHTML = '<div class="loading">Cargando productos...</div>'

  const { data, error } = await supabaseCliente.from("productos").select("*").order("created_at", { ascending: false })

  if (error) {
    productsList.innerHTML = "<p>Error al cargar productos</p>"
    console.error("Error:", error)
    return
  }

  productosActuales = data || []
  mostrarProductosEnTabla(productosActuales)
}

function mostrarProductosEnTabla(productos) {
  const productsList = document.getElementById("products-list")

  if (productos.length === 0) {
    productsList.innerHTML = '<p class="text-center">No hay productos registrados</p>'
    return
  }

  productsList.innerHTML = `
        <table class="products-table">
            <thead>
                <tr>
                    <th>Imagen</th>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${productos
                  .map(
                    (producto) => `
                    <tr>
                        <td>
                            <img src="${producto.imagen_url}" alt="${producto.nombre}" style="width: 50px; height: 50px; object-fit: cover; border-radius: var(--radius);">
                        </td>
                        <td>
                            <strong>${producto.nombre}</strong>
                            <br>
                            <small style="color: var(--color-text);">${producto.descripcion.substring(0, 50)}...</small>
                        </td>
                        <td>
                            <span class="category" style="background-color: var(--color-secondary); color: var(--color-primary); padding: 0.25rem 0.5rem; border-radius: 15px; font-size: 0.8rem;">
                                ${producto.categoria}
                            </span>
                        </td>
                        <td><strong>$${producto.precio}</strong></td>
                        <td>
                            <span class="stock ${producto.stock > 10 ? "in-stock" : producto.stock > 0 ? "low-stock" : "out-of-stock"}">
                                ${producto.stock}
                            </span>
                        </td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-edit" onclick="editarProducto(${producto.id})" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-delete" onclick="eliminarProducto(${producto.id}, '${producto.nombre}')" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `,
                  )
                  .join("")}
            </tbody>
        </table>
    `
}

function editarProducto(id) {
  const producto = productosActuales.find((p) => p.id === id)
  if (!producto) return

  productoEditando = producto

  // Llenar el formulario de edición
  document.getElementById("edit-id").value = producto.id
  document.getElementById("edit-nombre").value = producto.nombre
  document.getElementById("edit-categoria").value = producto.categoria
  document.getElementById("edit-descripcion").value = producto.descripcion
  document.getElementById("edit-precio").value = producto.precio
  document.getElementById("edit-stock").value = producto.stock
  document.getElementById("edit-image-preview").src = producto.imagen_url
  document.getElementById("edit-image-preview").style.display = "block"

  // Mostrar modal
  document.getElementById("edit-modal").classList.add("active")
}

async function eliminarProducto(id, nombre) {
  if (!confirm(`¿Estás seguro de que quieres eliminar "${nombre}"?`)) {
    return
  }

  const { error } = await supabaseCliente.from("productos").delete().eq("id", id)

  if (error) {
    alert("Error al eliminar el producto: " + error.message)
    console.error("Error:", error)
  } else {
    alert("Producto eliminado exitosamente")
    cargarProductosAdmin()
  }
}

function buscarProductos(termino) {
  const productosFiltrados = productosActuales.filter(
    (producto) =>
      producto.nombre.toLowerCase().includes(termino.toLowerCase()) ||
      producto.categoria.toLowerCase().includes(termino.toLowerCase()) ||
      producto.descripcion.toLowerCase().includes(termino.toLowerCase()),
  )
  mostrarProductosEnTabla(productosFiltrados)
}

async function actualizarProducto() {
  const submitButton = document.querySelector('#edit-product-form button[type="submit"]')
  submitButton.disabled = true
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...'

  const id = document.getElementById("edit-id").value
  const file = document.getElementById("edit-imagen").files[0]

  let imagenUrl = productoEditando.imagen_url

  // Si hay una nueva imagen, subirla
  if (file) {
    const filePath = `public/${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabaseCliente.storage
      .from("productos")
      .upload(filePath, file)

    if (uploadError) {
      alert("Error al subir la nueva imagen: " + uploadError.message)
      submitButton.disabled = false
      submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios'
      return
    }

    const { data: urlData } = supabaseCliente.storage.from("productos").getPublicUrl(uploadData.path)

    imagenUrl = urlData.publicUrl
  }

  const productData = {
    nombre: document.getElementById("edit-nombre").value,
    descripcion: document.getElementById("edit-descripcion").value,
    precio: Number.parseFloat(document.getElementById("edit-precio").value),
    stock: Number.parseInt(document.getElementById("edit-stock").value),
    categoria: document.getElementById("edit-categoria").value,
    imagen_url: imagenUrl,
  }

  const { error } = await supabaseCliente.from("productos").update(productData).eq("id", id)

  if (error) {
    alert("Error al actualizar el producto: " + error.message)
  } else {
    alert("¡Producto actualizado con éxito!")
    document.getElementById("edit-modal").classList.remove("active")
    cargarProductosAdmin()
  }

  submitButton.disabled = false
  submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios'
}

// Guardar el producto
productForm.addEventListener("submit", async (e) => {
  e.preventDefault()
  submitButton.disabled = true
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'

  const file = imageInput.files[0]
  if (!file) {
    alert("Por favor, selecciona una imagen para el producto.")
    submitButton.disabled = false
    submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Producto'
    return
  }

  const filePath = `public/${Date.now()}-${file.name}`
  const { data: uploadData, error: uploadError } = await supabaseCliente.storage
    .from("productos")
    .upload(filePath, file)

  if (uploadError) {
    alert("Error al subir la imagen: " + uploadError.message)
    console.error(uploadError) // Para ver el error detallado en consola
    submitButton.disabled = false
    submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Producto'
    return
  }

  const { data: urlData } = supabaseCliente.storage.from("productos").getPublicUrl(uploadData.path)

  const productData = {
    nombre: document.getElementById("nombre").value,
    descripcion: document.getElementById("descripcion").value,
    precio: Number.parseFloat(document.getElementById("precio").value),
    stock: Number.parseInt(document.getElementById("stock").value),
    categoria: document.getElementById("categoria").value,
    imagen_url: urlData.publicUrl,
  }

  const { error: insertError } = await supabaseCliente.from("productos").insert([productData])

  if (insertError) {
    alert("Error al guardar el producto: " + insertError.message)
  } else {
    alert("¡Producto guardado con éxito!")
    productForm.reset()
    imagePreview.src = ""
    imagePreview.style.display = "none"
    cargarProductosAdmin() // Actualizar la lista
  }

  submitButton.disabled = false
  submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Producto'
})
