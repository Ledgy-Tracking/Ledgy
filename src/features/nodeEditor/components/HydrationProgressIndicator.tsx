import React from 'react';
import { Loader2 } from 'lucide-react';

interface HydrationProgressIndicatorProps {
    isVisible: boolean;
    message: string;
}

/**
 * Progress indicator for ledger node hydration
 * Shows during concurrent hydration of multiple ledger nodes
 */
export const HydrationProgressIndicator: React.FC<HydrationProgressIndicatorProps> = ({
    isVisible,
    message
}) => {
    if (!isVisible) return null;

    return (
        <div className="fixed top-4 right-4 z-50 bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-lg">
            <div className="flex items-center gap-2 text-zinc-300">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">{message}</span>
            </div>
        </div>
    );
};