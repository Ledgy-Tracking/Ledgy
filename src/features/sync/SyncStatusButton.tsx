import React from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, CloudOff, Wifi } from 'lucide-react';
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
        if (isLoading) return <RefreshCw size={18} className="animate-spin text-emerald-500" />;

        switch (syncStatus.status) {
            case 'syncing':
                return <RefreshCw size={18} className="animate-spin text-emerald-500" />;
            case 'idle':
            case 'synced':
                return <CheckCircle2 size={18} className="text-emerald-500" />;
            case 'conflict':
                return <AlertCircle size={18} className="text-amber-500" />;
            case 'offline':
                return <CloudOff size={18} className="text-zinc-400" />;
            case 'pending':
                return <Wifi size={18} className="text-zinc-400 animate-pulse" />;
            default:
                return <CloudOff size={18} className="text-zinc-400" />;
        }
    };

    const getStatusText = () => {
        if (isLoading) return 'Loading...';

        switch (syncStatus.status) {
            case 'syncing':
                return 'Syncing...';
            case 'idle':
            case 'synced':
                return syncStatus.lastSync ? `Last sync: ${new Date(syncStatus.lastSync).toLocaleTimeString()}` : 'Synced';
            case 'conflict':
                return 'Sync Conflict';
            case 'offline':
                return 'Offline';
            case 'pending':
                return 'Pending Sync';
            default:
                return 'Sync Not Configured';
        }
    };

    const handleSyncClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerSync(profileId);
    };

    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-all group shrink-0 ${(isLoading || syncStatus.status === 'syncing') ? 'ring-2 ring-emerald-500/20 animate-pulse' : ''
                }`}
            title="Open Sync Settings"
        >
            <div className="flex items-center justify-center">
                {getStatusIcon()}
            </div>
            <div className="flex flex-col items-start leading-none">
                <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-500 transition-colors">CouchDB Sync</span>
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 truncate max-w-[120px]">
                    {getStatusText()}
                </span>
            </div>

            {/* Direct Sync Trigger Button */}
            <div
                onClick={handleSyncClick}
                className="p-1 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-400 hover:text-emerald-500 transition-all ml-1"
                title="Force Sync Now"
            >
                <RefreshCw size={12} className={isLoading || syncStatus.status === 'syncing' ? 'animate-spin' : ''} />
            </div>
        </button>
    );
};
