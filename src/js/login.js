import supabase from "https://esm.sh/supabase-js"

const SUPABASE_URL = "https://sliqaezclxbvlxwbqpjp.supabase.co" // <-- ¡Pega tu URL aquí!
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXFhZXpjbHhidmx4d2JxcGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTQwNzYsImV4cCI6MjA3MDg5MDA3Nn0.inNhc24bE0E6B9UOBnSBc0_sxsPrTX4JRaynET68Lsk" // <-- ¡Pega tu clave anónima aquí!

const supabaseCliente = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const loginForm = document.getElementById("login-form")
const errorMessage = document.getElementById("error-message")

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault()
  errorMessage.textContent = ""

  const email = document.getElementById("email").value
  const password = document.getElementById("password").value

  const { data, error } = await supabaseCliente.auth.signInWithPassword({
    email: email,
    password: password,
  })

  if (error) {
    errorMessage.textContent = "Email o contraseña incorrectos."
  } else {
    window.location.href = "/admin.html"
  }
})
