import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // Proxied by Nginx to backend
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const _res = error.response;
        // Handle 401 Unauthorized
        if (_res?.status === 401) {
            // Don't redirect if it's a login attempt failure (invalid credentials)
            if (!error.config.url.includes('/auth/login') && !window.location.pathname.includes('/login')) {
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser'); // Keep currentUser as per original, or change to 'user' if intended
                window.location.href = '/login';
            }
        }
        // 403 Forbidden shouldn't log out, just reject promise (UI can show error)
        if (_res?.status === 403) {
            console.error("Access forbidden (403)", error.config.url);
        }
        return Promise.reject(error);
    }
);

// Helper for exponential backoff
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const uploadFileWithRetry = async (url: string, formData: FormData, retries = 3, delay = 1000): Promise<any> => {
    try {
        return await api.post(url, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 1000 * 60 * 5, // 5 minutes per chunk
        });
    } catch (error: any) {
        if (retries > 0) {
            if (error.response && error.response.status >= 400 && error.response.status < 500) {
                throw error; // Don't retry client errors (4xx)
            }
            await wait(delay);
            return uploadFileWithRetry(url, formData, retries - 1, delay * 2);
        }
        throw error;
    }
};

export const deleteBand = async (bandId: string) => {
    const response = await api.delete(`/bands/${bandId}`);
    return response.data;
};

export const uploadFile = async (file: File, type: 'image' | 'audio' | 'video' | 'file' = 'file') => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/upload/${type}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data; // Returns filename/URL
};

export default api;
