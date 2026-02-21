import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, useIsRegistered } from './useAuthStore';

interface UnlockGuardProps {
    children: React.ReactNode;
}

export const UnlockGuard: React.FC<UnlockGuardProps> = ({ children }) => {
    const isUnlocked = useAuthStore(state => state.isUnlocked);
    const isRegistered = useIsRegistered();
    const location = useLocation();

    // If "reset=true" query param is present, allow access even if unlocked
    // This provides an escape hatch for users who want to reset their vault
    // but are stuck in an auto-unlocked state.
    const isResetMode = new URLSearchParams(location.search).get('reset') === 'true';

    if (!isRegistered) {
        return <Navigate to="/setup" replace />;
    }

    if (isUnlocked && !isResetMode) {
        return <Navigate to="/profiles" replace />;
    }

    return <>{children}</>;
};
