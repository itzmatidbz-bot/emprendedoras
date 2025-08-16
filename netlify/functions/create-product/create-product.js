// create-product.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL; // Set your Supabase URL in Netlify environment variables
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY; // Set your Supabase anon key in Netlify environment variables

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method not allowed' }),
        };
    }

    const { nombre, descripcion, precio, stock, categoria, imagen_url } = JSON.parse(event.body);

    if (!nombre || !descripcion || !precio || !stock || !categoria || !imagen_url) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'All fields are required' }),
        };
    }

    const { data, error } = await supabase
        .from('productos')
        .insert([{ nombre, descripcion, precio, stock, categoria, imagen_url }]);

    if (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error creating product', error }),
        };
    }

    return {
        statusCode: 201,
        body: JSON.stringify({ message: 'Product created successfully', product: data }),
    };
};