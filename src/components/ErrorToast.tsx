import React, { useEffect, useState } from 'react';
import { useErrorStore } from '../stores/useErrorStore';
import { AlertCircle, X, Info, AlertTriangle } from 'lucide-react';

export const ErrorToast: React.FC = () => {
    const { error, clearError } = useErrorStore();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (error) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                handleClose();
            }, 5000); // 5 seconds for visibility
            return () => clearTimeout(timer);
        }
    }, [error]);

    const handleClose = () => {
        setIsVisible(false);
        const currentTimestamp = error?.timestamp;
        // Wait for animation to finish before clearing store
        setTimeout(() => clearError(currentTimestamp), 300);
    };

    if (!error && !isVisible) return null;

    const Icon = error?.type === 'warning' ? AlertTriangle :
        error?.type === 'info' ? Info : AlertCircle;

    const bgColor = error?.type === 'warning' ? 'bg-amber-900/90' :
        error?.type === 'info' ? 'bg-blue-900/90' : 'bg-red-950/90';

    const borderColor = error?.type === 'warning' ? 'border-amber-500' :
        error?.type === 'info' ? 'border-blue-500' : 'border-red-500';

    const textColor = error?.type === 'warning' ? 'text-amber-200' :
        error?.type === 'info' ? 'text-blue-200' : 'text-red-200';

    return (
        <div
            className={`fixed bottom-6 right-6 z-50 transition-all duration-300 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
        >
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl backdrop-blur-md ${bgColor} ${borderColor} ${textColor} min-w-[300px] max-w-md`}>
                <div className="shrink-0">
                    <Icon size={20} className={error?.type === 'error' ? 'text-red-400' : ''} />
                </div>
                <div className="flex-grow text-sm font-medium">
                    {error?.message}
                </div>
                <button
                    onClick={handleClose}
                    className="shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
                    aria-label="Close"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};
