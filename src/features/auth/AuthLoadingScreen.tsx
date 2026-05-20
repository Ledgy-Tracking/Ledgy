import React from 'react';
import { Toast } from '@/components/ui/toast';

export const AuthLoadingScreen: React.FC = () => {
    return (
        <Toast
            className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col items-center justify-center p-6 font-sans"
            aria-label="Loading authentication state"
            aria-busy="true"
            role="status"
        >
            <div className="w-full max-w-sm space-y-8 text-center">
                <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                <p className="text-zinc-400">Loading...</p>
            </div>
        </Toast>
    );
};
