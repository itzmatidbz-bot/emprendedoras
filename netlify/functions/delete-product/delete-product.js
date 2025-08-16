module.exports.handler = async (event) => {
    const { id } = JSON.parse(event.body);

    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Product ID is required' }),
        };
    }

    // Here you would typically connect to your database and delete the product
    // For example, using Supabase or another database service

    // Assuming a function deleteProductFromDatabase exists
    // const { error } = await deleteProductFromDatabase(id);

    // if (error) {
    //     return {
    //         statusCode: 500,
    //         body: JSON.stringify({ message: 'Error deleting product' }),
    //     };
    // }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Product deleted successfully' }),
    };
};