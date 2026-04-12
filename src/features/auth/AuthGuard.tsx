import React from 'react';
import { Navigate } from 'react-router-dom';
import { AuthLoadingScreen } from './AuthLoadingScreen';
import { useAuthStore, useIsRegistered } from './useAuthStore';

interface AuthGuardProps {
    children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const isUnlocked = useAuthStore(state => state.isUnlocked);
    const hasHydrated = useAuthStore(state => state.hasHydrated);
    const isRegistered = useIsRegistered();

    if (!hasHydrated) {
        return <AuthLoadingScreen />;
    }

    if (!isRegistered) {
        return <Navigate to="/setup" replace />;
    }

    if (!isUnlocked) {
        return <Navigate to="/unlock" replace />;
    }

    return <>{children}</>;
};
