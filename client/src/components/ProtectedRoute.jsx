// In client/src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated()) {
        // User is not logged in, redirect to login page
        return <Navigate to="/login" replace />;
    }

    return children; // User is logged in, render the component they asked for
};

export default ProtectedRoute;