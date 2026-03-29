import React, { useEffect, useState } from 'react';
import { useErrorStore } from '../stores/useErrorStore';
import { AlertCircle, X, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

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

    return (
        <div
            className={cn(
                "fixed bottom-6 right-6 z-50 transition-all duration-300 transform min-w-[300px] max-w-md",
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            )}
        >
            <Alert className={cn(
                "backdrop-blur-md shadow-2xl border",
                error?.type === 'warning' 
                    ? 'bg-amber-900/90 border-amber-500 text-amber-200'
                    : error?.type === 'info' 
                    ? 'bg-blue-900/90 border-blue-500 text-blue-200' 
                    : 'bg-red-950/90 border-red-500 text-red-200'
            )}>
                <Icon className={cn(
                    "h-4 w-4",
                    error?.type === 'error' ? 'text-red-400' : ''
                )} />
                <AlertDescription className="flex items-center justify-between pr-2">
                    <span className="text-sm font-medium">{error?.message}</span>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleClose}
                        aria-label="Close"
                        className="hover:bg-white/10 ml-2"
                    >
                        <X size={16} />
                    </Button>
                </AlertDescription>
            </Alert>
        </div>
    );
};
