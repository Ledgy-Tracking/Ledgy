import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './useAuthStore';

interface AuthGuardProps {
    children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const { isUnlocked, isRegistered } = useAuthStore();
    const location = useLocation();

    if (!isRegistered()) {
        // If not registered, always force setup
        if (location.pathname !== '/setup') {
            return <Navigate to="/setup" replace />;
        }
        return <>{children}</>;
    }

    if (!isUnlocked) {
        // If registered but locked, redirect to unlock (to be implemented)
        // For now, if /unlock doesn't exist, we'll just stay on /setup or home
        // but the next story 1.3 handles the unlock flow.
        // For story 1.2, we just care about the registration flow.
        // If locked, we'll just let them go to /unlock if that's where we are.
        if (location.pathname !== '/unlock' && location.pathname !== '/setup') {
            // Since /unlock isn't built yet, we'll redirect to /setup as a fallback
            // or just return children if we want to allow testing the dashboard
            // after registration (which sets isUnlocked = true).
            return <Navigate to="/setup" replace />;
        }
    }

    return <>{children}</>;
};
