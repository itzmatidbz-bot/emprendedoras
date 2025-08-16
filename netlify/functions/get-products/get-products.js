exports.handler = async (event) => {
    const { createClient } = require('@supabase/supabase-js');

    const SUPABASE_URL = 'URL_DE_TU_PROYECTO'; // <-- ¡Pega tu URL aquí!
    const SUPABASE_ANON_KEY = 'TU_ANON_KEY'; // <-- ¡Pega tu clave anónima aquí!

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    try {
        const { data, error } = await supabase
            .from('productos')
            .select('*');

        if (error) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: error.message }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error retrieving products' }),
        };
    }
};