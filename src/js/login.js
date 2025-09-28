const SUPABASE_URL = 'https://sliqaezclxbvlxwbqpjp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXFhZXpjbHhidmx4d2JxcGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTQwNzYsImV4cCI6MjA3MDg5MDA3Nn0.inNhc24bE0E6B9UOBnSBc0_sxsPrTX4JRaynET68Lsk';

const supabaseCliente = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        storageKey: 'admin-auth',
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

// Verificar si ya hay una sesión activa
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session }, error } = await supabaseCliente.auth.getSession();
    if (session) {
        // Verificar si es administrador
        try {
            const { data: profile, error: profileError } = await supabaseCliente
                .from('perfiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (!profileError && profile && profile.role === 'admin') {
                window.location.href = '/admin.html';
                return;
            }
        } catch (error) {
            console.error('Error al verificar rol:', error);
        }
    }
});

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessage.textContent = '';
    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando sesión...';

    try {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const { data, error } = await supabaseCliente.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        // Crear tabla de perfiles si no existe
        const { error: createTableError } = await supabaseCliente.rpc('create_profiles_table');
        
        // Insertar o actualizar perfil de administrador
        const { error: updateProfileError } = await supabaseCliente
            .from('perfiles')
            .upsert([
                { 
                    id: data.user.id,
                    role: 'admin',
                    email: data.user.email
                }
            ], { onConflict: 'id' });

        if (updateProfileError) {
            console.error('Error al actualizar perfil:', updateProfileError);
        }

        window.location.href = '/admin.html';

    } catch (error) {
        console.error('Error de inicio de sesión:', error);
        errorMessage.textContent = 'Email o contraseña incorrectos.';
        submitButton.disabled = false;
        submitButton.innerHTML = 'Iniciar Sesión';
    }
});
// CORREGIDO: Se eliminó una llave "}" extra que había aquí