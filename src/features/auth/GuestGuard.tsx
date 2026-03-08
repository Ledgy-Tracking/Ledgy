import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, useIsRegistered } from './useAuthStore';

interface GuestGuardProps {
    children: React.ReactNode;
}

export const GuestGuard: React.FC<GuestGuardProps> = ({ children }) => {
    const isUnlocked = useAuthStore(state => state.isUnlocked);
    const isRegistered = useIsRegistered();

    const location = useLocation();

    if (isUnlocked) {
        return <Navigate to="/profiles" replace />;
    }

    if (isRegistered && location.pathname !== '/unlock') {
        return <Navigate to="/unlock" replace />;
    }

    return <>{children}</>;
};
