// In client/src/components/RoleRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// 'allowedRoles' will be an array, e.g., ['Admin', 'Faculty']
const RoleRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user.role)) {
        // Not authorized, send to their dashboard
        return <Navigate to="/dashboard" replace />;
    }

    // Authorized
    return children;
};

export default RoleRoute;