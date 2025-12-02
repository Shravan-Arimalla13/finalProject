// In client/src/components/AdminRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated()) {
        // Not logged in
        return <Navigate to="/login" replace />;
    }

    if (user.role !== 'SuperAdmin') {
        // Logged in, but not an Admin
        // Send them back to their own dashboard
        return <Navigate to="/dashboard" replace />;
    }

    // Logged in and is an Admin
    return children;
};

export default AdminRoute;