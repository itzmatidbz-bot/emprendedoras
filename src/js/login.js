// login.js
const SUPABASE_URL = 'https://fmsysdjqcliuwjesilam.supabase.co'; // <-- ¡Pega tu URL aquí!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtc3lzZGpxY2xpdXdqZXNpbGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMDYzNTYsImV4cCI6MjA3MDg4MjM1Nn0.PJpuqtAAnP5396wzP-g4Bh2tFs_NWjJ6YgyQiTVcx5w'; // <-- ¡Pega tu clave anónima aquí!


const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessage.textContent = '';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        errorMessage.textContent = 'Email o contraseña incorrectos.';
    } else {
        window.location.href = '/admin.html';
    }
});