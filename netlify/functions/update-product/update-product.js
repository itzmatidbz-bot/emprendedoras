exports.handler = async (event) => {
    const { id, name, description, price, stock, category } = JSON.parse(event.body);

    // Validate input
    if (!id || !name || !description || !price || !stock || !category) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'All fields are required.' }),
        };
    }

    // Here you would typically interact with your database to update the product
    // For example, using Supabase or another database client

    // Mock response for demonstration purposes
    const updatedProduct = {
        id,
        name,
        description,
        price,
        stock,
        category,
    };

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Product updated successfully', product: updatedProduct }),
    };
};