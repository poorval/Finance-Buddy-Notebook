import axios from 'axios';
import { createClient } from './supabase/client';

const api = axios.create({
    baseURL: 'http://localhost:8000',
});

api.interceptors.request.use(async (config) => {
    if (typeof window !== 'undefined') {
        const mode = localStorage.getItem('storage_mode') || 'local';
        config.headers['X-Storage-Mode'] = mode;

        // Add Auth Token if available
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.access_token) {
            config.headers['Authorization'] = `Bearer ${session.access_token}`;
        }
    }
    return config;
});

export default api;
