import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore, useIsRegistered } from './useAuthStore';

interface AuthGuardProps {
    children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const isUnlocked = useAuthStore(state => state.isUnlocked);
    const isRegistered = useIsRegistered();

    if (!isRegistered) {
        return <Navigate to="/setup" replace />;
    }

    if (!isUnlocked) {
        return <Navigate to="/unlock" replace />;
    }

    return <>{children}</>;
};
