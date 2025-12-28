// // // In client/src/api.js
// // import axios from 'axios';

// // // Use the environment variable if it exists, otherwise localhost (for dev)
// // const BASE_URL = import.meta.env.VITE_API_URL;

// // const api = axios.create({
// //     baseURL: BASE_URL,
// // });
// // // ...
// // export default api;

// import axios from 'axios';

// const api = axios.create({
//     baseURL: 'https://finalproject-jq2d.onrender.com/api',
// });

// // CRITICAL: Interceptor to attach Token
// api.interceptors.request.use((config) => {
//     const token = localStorage.getItem('token'); // or however you store it
//     if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
// }, (error) => {
//     return Promise.reject(error);
// });

// export default api;


// client/src/api.js - FIXED VERSION
import axios from 'axios';

const api = axios.create({
    baseURL: 'https://finalproject-jq2d.onrender.com/api',
    timeout: 30000, // 30 second timeout
});

// CRITICAL: Request Interceptor - Attach Token to EVERY Request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('🔐 Token attached to request:', config.url);
        } else {
            console.warn('⚠️ No token found for request:', config.url);
        }
        
        return config;
    },
    (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Response Interceptor - Handle 401 Errors
api.interceptors.response.use(
    (response) => {
        // Success response
        return response;
    },
    (error) => {
        if (error.response) {
            // Server responded with error status
            const status = error.response.status;
            
            if (status === 401) {
                console.error('🚫 401 Unauthorized - Token may be invalid or expired');
                
                // Clear invalid token
                localStorage.removeItem('token');
                
                // Redirect to login if not already there
                if (!window.location.pathname.includes('/login')) {
                    console.log('↪️ Redirecting to login...');
                    window.location.href = '/login';
                }
            } else if (status === 403) {
                console.error('🚫 403 Forbidden - Insufficient permissions');
            } else if (status === 404) {
                console.error('🔍 404 Not Found:', error.config.url);
            } else if (status >= 500) {
                console.error('💥 Server Error:', status);
            }
        } else if (error.request) {
            // Request made but no response
            console.error('📡 Network Error - No response from server');
        } else {
            // Something else happened
            console.error('❌ Request Error:', error.message);
        }
        
        return Promise.reject(error);
    }
);

export default api;