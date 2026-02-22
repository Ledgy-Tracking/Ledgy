import React from 'react';
import { Cloud, CloudOff, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

export type SyncState = 'synced' | 'syncing' | 'pending' | 'offline' | 'conflict';

interface SyncStatusBadgeProps {
    state: SyncState;
    lastSyncTime?: string;
    conflictCount?: number;
    onClick?: () => void;
}

/**
 * Sync Status Badge component.
 * Displays current sync state with color, icon, and optional conflict count.
 */
export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
    state,
    lastSyncTime,
    conflictCount = 0,
    onClick,
}) => {
    const config = getSyncStateConfig(state);
    const Icon = config.icon;

    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${config.bgClass} ${config.textClass} hover:opacity-80`}
            role="status"
            aria-live="polite"
            aria-label={`Sync status: ${state}${lastSyncTime ? `, last synced ${formatLastSync(lastSyncTime)}` : ''}`}
            title={lastSyncTime ? `Last synced: ${new Date(lastSyncTime).toLocaleString()}` : undefined}
        >
            <Icon size={14} className={state === 'syncing' ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{config.label}</span>
            {state === 'conflict' && conflictCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-900 text-amber-100 rounded-full">
                    {conflictCount}
                </span>
            )}
        </button>
    );
};

function getSyncStateConfig(state: SyncState) {
    switch (state) {
        case 'synced':
            return {
                label: 'Synced',
                bgClass: 'bg-emerald-900/30',
                textClass: 'text-emerald-400',
                icon: CheckCircle,
            };
        case 'syncing':
            return {
                label: 'Syncing...',
                bgClass: 'bg-blue-900/30',
                textClass: 'text-blue-400',
                icon: RefreshCw,
            };
        case 'pending':
            return {
                label: 'Pending',
                bgClass: 'bg-amber-900/30',
                textClass: 'text-amber-400',
                icon: Cloud,
            };
        case 'offline':
            return {
                label: 'Offline',
                bgClass: 'bg-zinc-800',
                textClass: 'text-zinc-400',
                icon: CloudOff,
            };
        case 'conflict':
            return {
                label: 'Conflicts',
                bgClass: 'bg-amber-900/30',
                textClass: 'text-amber-400',
                icon: AlertTriangle,
            };
    }
}

function formatLastSync(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
}
