import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from './useAuthStore';

interface UnlockGuardProps {
    children: React.ReactNode;
}

export const UnlockGuard: React.FC<UnlockGuardProps> = ({ children }) => {
    const isUnlocked = useAuthStore(state => state.isUnlocked);
    const totpSecret = useAuthStore(state => state.totpSecret);
    const encryptedTotpSecret = useAuthStore(state => state.encryptedTotpSecret);
    const isRegistered = !!(totpSecret || encryptedTotpSecret);

    if (!isRegistered) {
        return <Navigate to="/setup" replace />;
    }

    if (isUnlocked) {
        return <Navigate to="/profiles" replace />;
    }

    return <>{children}</>;
};
