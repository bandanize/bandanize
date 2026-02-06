import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api', // Use env var or fallback to proxy
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
        // Handle 401 Unauthorized or 403 Forbidden (Expired/Invalid Token)
        if (_res?.status === 401 || _res?.status === 403) {
            // Don't redirect if it's a login attempt failure (invalid credentials)
            if (!error.config.url.includes('/auth/login') && !window.location.pathname.includes('/login')) {
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
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

export const getMediaUrl = (path: string | undefined) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    const baseUrl = import.meta.env.VITE_API_URL || '';

    // If no VITE_API_URL (Docker/Proxy mode), keep as is (relative)
    if (!baseUrl) return path;

    // Cloudflare/Direct mode: Ensure absolute URL
    // precise normalization to avoid double /api or missing /api
    const cleanBase = baseUrl.replace(/\/+$/, '').replace(/\/api$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const apiPath = cleanPath.startsWith('/api') ? cleanPath : `/api${cleanPath}`;


    return `${cleanBase}${apiPath}`;
};

export const forgotPassword = async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
};

export const resetPassword = async (token: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data;
};

export default api;
