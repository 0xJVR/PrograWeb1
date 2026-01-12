// GraphQL Client Helper

async function graphqlRequest(query, variables = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch('/graphql', {
            method: 'POST',
            headers,
            body: JSON.stringify({ query, variables }),
        });

        const responseBody = await response.json();

        if (responseBody.errors) {
            console.error('GraphQL Errors:', responseBody.errors);
            throw new Error(responseBody.errors[0].message || 'Error en la petición GraphQL');
        }

        return responseBody.data;
    } catch (error) {
        console.error('GraphQL Request Failed:', error);
        throw error;
    }
}
