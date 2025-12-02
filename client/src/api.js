// In client/src/api.js
import axios from 'axios';

// Use the environment variable if it exists, otherwise localhost (for dev)
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
    baseURL: BASE_URL,
});
// ...
export default api;