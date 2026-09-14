import axios from 'axios';
import { getAuthToken } from './clerkToken';

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
})

// The backend now verifies the caller's identity from a Clerk session
// token instead of trusting a clerkId in the request body/params, so every
// request needs an Authorization header. getAuthToken() reads from a
// getter that ClerkTokenBridge only registers once Clerk has actually
// finished loading (previously this read window.Clerk.session.getToken()
// directly, which raced Clerk's own init on first page load and caused
// requests right after sign-in to silently 401).
axiosInstance.interceptors.request.use(async (config) => {
    try {
        const token = await getAuthToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (error) {
        console.error('Could not attach Clerk auth token:', error);
    }
    return config;
});

export default axiosInstance;
