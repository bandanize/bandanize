import axios, { AxiosError, AxiosResponse } from 'axios';

/** Routes that don't require authentication */
export const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

/**
 * Extract a user-friendly error message from an API error.
 * Handles the backend ErrorResponse JSON format { timestamp, message, details }
 * as well as plain string responses and generic errors.
 */
export function extractErrorMessage(err: unknown, fallback = 'Ha ocurrido un error'): string {
    if (axios.isAxiosError(err)) {
        const data = (err as AxiosError).response?.data;
        if (data && typeof data === 'object' && 'message' in data) {
            return (data as { message: string }).message;
        }
        if (typeof data === 'string' && data.length > 0) {
            return data;
        }
        return err.message || fallback;
    }
    if (err instanceof Error) return err.message || fallback;
    return fallback;
}

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
            const isPublicRoute = PUBLIC_ROUTES.some(route => window.location.pathname.startsWith(route));

            if (!error.config.url.includes('/auth/login') && !isPublicRoute) {
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Helper for exponential backoff
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const uploadFileWithRetry = async (url: string, formData: FormData, retries = 3, delay = 1000): Promise<AxiosResponse<unknown>> => {
    try {
        return await api.post(url, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 1000 * 60 * 5, // 5 minutes per chunk
        });
    } catch (error: unknown) {
        if (retries > 0) {
            if (axios.isAxiosError(error) && error.response && error.response.status >= 400 && error.response.status < 500) {
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

export const getProjectNotifications = async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}/notifications`);
    return response.data;
};

export const getUnreadNotificationCount = async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}/notifications/unread-count`);
    return response.data;
};


export const markNotificationsRead = async (projectId: string) => {
    const response = await api.post(`/projects/${projectId}/notifications/mark-read`);
    return response.data;
};

export const getUnreadChatStatus = async (projectId: string) => {
    const response = await api.get(`/bands/${projectId}/chat/unread`);
    return response.data;
};

export const markChatAsRead = async (projectId: string) => {
    const response = await api.post(`/bands/${projectId}/chat/read`);
    return response.data;
};

// Calendar Events
export const getProjectEvents = async (projectId: string) => {
    const response = await api.get(`/bands/${projectId}/events`);
    return response.data;
};

export const createProjectEvent = async (projectId: string, event: { name: string; description?: string; date: string; type: string; location?: string }) => {
    const response = await api.post(`/bands/${projectId}/events`, event);
    return response.data;
};

export const updateProjectEvent = async (eventId: number, event: { name?: string; description?: string; date?: string; type?: string; location?: string }) => {
    const response = await api.put(`/events/${eventId}`, event);
    return response.data;
};

export const deleteProjectEvent = async (eventId: number) => {
    const response = await api.delete(`/events/${eventId}`);
    return response.data;
};

export default api;
