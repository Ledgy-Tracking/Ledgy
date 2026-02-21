import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from './useAuthStore';

interface GuestGuardProps {
    children: React.ReactNode;
}

export const GuestGuard: React.FC<GuestGuardProps> = ({ children }) => {
    const isUnlocked = useAuthStore(state => state.isUnlocked);
    const totpSecret = useAuthStore(state => state.totpSecret);
    const encryptedTotpSecret = useAuthStore(state => state.encryptedTotpSecret);
    const isRegistered = !!(totpSecret || encryptedTotpSecret);

    if (isUnlocked) {
        return <Navigate to="/profiles" replace />;
    }

    if (isRegistered) {
        return <Navigate to="/unlock" replace />;
    }

    return <>{children}</>;
};
