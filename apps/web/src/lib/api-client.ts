import axios from 'axios';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// Attach Keycloak JWT token to every request
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('kc_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 — redirect to Keycloak login
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('kc_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    },
);

export default apiClient;
