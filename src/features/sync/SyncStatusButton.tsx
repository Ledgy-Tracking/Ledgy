import React from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, CloudOff, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSyncStore } from '../../stores/useSyncStore';
import { useAuthStore } from '../auth/useAuthStore';

interface SyncStatusButtonProps {
    profileId: string;
    onClick: () => void;
}

export const SyncStatusButton: React.FC<SyncStatusButtonProps> = ({ profileId, onClick }) => {
    const { syncStatus, triggerSync, isLoading } = useSyncStore();
    const { isUnlocked } = useAuthStore();

    if (!isUnlocked) return null;

    const getStatusIcon = () => {
        const iconClass = "w-4 h-4";
        
        if (isLoading) return <RefreshCw size={16} className={`${iconClass} animate-spin text-emerald-500`} />;

        switch (syncStatus.status) {
            case 'syncing':
                return <RefreshCw size={16} className={`${iconClass} animate-spin text-emerald-500`} />;
            case 'idle':
            case 'synced':
                return <CheckCircle2 size={16} className={`${iconClass} text-emerald-500`} />;
            case 'conflict':
                return <AlertCircle size={16} className={`${iconClass} text-amber-500`} />;
            case 'offline':
                return <CloudOff size={16} className={`${iconClass} text-zinc-400`} />;
            case 'pending':
                return <Wifi size={16} className={`${iconClass} text-zinc-400 animate-pulse`} />;
            default:
                return <CloudOff size={16} className={`${iconClass} text-zinc-400`} />;
        }
    };

    const getStatusText = () => {
        if (isLoading) return 'Syncing...';

        switch (syncStatus.status) {
            case 'syncing':
                return 'Syncing...';
            case 'idle':
            case 'synced':
                return syncStatus.lastSync ? `Updated ${formatTimeAgo(syncStatus.lastSync)}` : 'Synced';
            case 'conflict':
                return 'Conflict detected';
            case 'offline':
                return 'Offline mode';
            case 'pending':
                return 'Pending changes';
            default:
                return 'Not configured';
        }
    };

    const formatTimeAgo = (date: string) => {
        const now = new Date();
        const syncDate = new Date(date);
        const diffMs = now.getTime() - syncDate.getTime();
        const diffMins = Math.round(diffMs / 60000);
        const diffHours = Math.round(diffMs / 3600000);
        const diffDays = Math.round(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    const handleSyncClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerSync(profileId);
    };

    return (
        <Button
            variant="ghost"
            onClick={onClick}
            className={`w-full flex items-center justify-between px-2 py-1.5 h-auto rounded-md transition-all group hover:bg-zinc-100 dark:hover:bg-zinc-700 ${(isLoading || syncStatus.status === 'syncing') ? 'bg-zinc-100 dark:bg-zinc-700' : ''
                }`}
            title="Open Sync Settings"
        >
            <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-4 h-4">
                    {getStatusIcon()}
                </div>
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 truncate max-w-[120px]">
                    {getStatusText()}
                </span>
            </div>

            {/* Direct Sync Trigger Button */}
            <div
                onClick={handleSyncClick}
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-400 hover:text-emerald-500 transition-all"
                title="Force Sync Now"
            >
                <RefreshCw size={12} className={isLoading || syncStatus.status === 'syncing' ? 'animate-spin' : ''} />
            </div>
        </Button>
    );
};
