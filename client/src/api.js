// // In client/src/api.js
// import axios from 'axios';

// // Use the environment variable if it exists, otherwise localhost (for dev)
// const BASE_URL = import.meta.env.VITE_API_URL;

// const api = axios.create({
//     baseURL: BASE_URL,
// });
// // ...
// export default api;

import axios from 'axios';

const api = axios.create({
    baseURL: 'https://finalproject-jq2d.onrender.com/api',
});

// CRITICAL: Interceptor to attach Token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token'); // or however you store it
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;