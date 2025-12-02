// In client/src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api'; // Import our axios instance

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));

    useEffect(() => {
        // On app load, check if token exists. If so, fetch user data.
        const fetchUser = async () => {
            if (token) {
                try {
                    // Set the token in our API helper for all future requests
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                    const response = await api.get('/users/profile');
                    setUser(response.data);
                } catch (error) {
                    // Token is invalid or expired
                    console.error('Failed to fetch user', error);
                    logout(); // Clear the bad token
                }
            }
        };
        fetchUser();
    }, [token]);

    const login = (userData, userToken) => {
        localStorage.setItem('token', userToken);
        setToken(userToken);
        setUser(userData);
        api.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        delete api.defaults.headers.common['Authorization'];
    };

    const isAuthenticated = () => {
        // Strict check: Must have a token AND a user object
        return !!token && !!user; 
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to easily use the auth context in any component
export const useAuth = () => {
    return useContext(AuthContext);
};