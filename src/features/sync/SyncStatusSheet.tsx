import React from 'react';
import { X, RefreshCw, CheckCircle2, AlertCircle, CloudOff, Wifi, Info, ShieldCheck, History, ExternalLink, Trash2 } from 'lucide-react';
import { useSyncStore } from '../../stores/useSyncStore';
import { useAuthStore } from '../auth/useAuthStore';

interface SyncStatusSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenSettings: () => void;
    onResolveAll: () => void;
    profileId: string;
}

export const SyncStatusSheet: React.FC<SyncStatusSheetProps> = ({ isOpen, onClose, onOpenSettings, onResolveAll, profileId }) => {
    const { syncStatus, syncConfig, conflicts, isLoading, triggerSync } = useSyncStore();
    const { isUnlocked } = useAuthStore();

    if (!isUnlocked || !isOpen) return null;

    const getStatusDetails = () => {
        switch (syncStatus.status) {
            case 'syncing':
                return {
                    label: 'Synchronizing',
                    description: 'Your data is being replicated to/from CouchDB.',
                    color: 'text-emerald-500',
                    bg: 'bg-emerald-500/10',
                    icon: <RefreshCw size={20} className="animate-spin" />
                };
            case 'idle':
            case 'synced':
                return {
                    label: 'Fully Synced',
                    description: 'All local changes have been replicated successfully.',
                    color: 'text-emerald-500',
                    bg: 'bg-emerald-500/10',
                    icon: <CheckCircle2 size={20} />
                };
            case 'conflict':
                return {
                    label: 'Sync Conflicts',
                    description: `${syncStatus.conflictCount || 0} items require manual resolution.`,
                    color: 'text-amber-500',
                    bg: 'bg-amber-500/10',
                    icon: <AlertCircle size={20} />
                };
            case 'offline':
                return {
                    label: 'Offline',
                    description: 'Cannot reach the remote CouchDB instance.',
                    color: 'text-zinc-400',
                    bg: 'bg-zinc-400/10',
                    icon: <CloudOff size={20} />
                };
            case 'pending':
                return {
                    label: 'Pending Changes',
                    description: 'Waiting to push local changes to the remote server.',
                    color: 'text-zinc-400',
                    bg: 'bg-zinc-400/10',
                    icon: <Wifi size={20} className="animate-pulse" />
                };
            case 'error':
                return {
                    label: 'Sync Error',
                    description: syncStatus.lastError || 'An error occurred during verification or synchronization.',
                    color: 'text-red-500',
                    bg: 'bg-red-500/10',
                    icon: <AlertCircle size={20} />
                };
            default:
                return {
                    label: 'Not Configured',
                    description: 'Set up a CouchDB instance to enable remote sync.',
                    color: 'text-zinc-400',
                    bg: 'bg-zinc-400/10',
                    icon: <Info size={20} />
                };
        }
    };

    const details = getStatusDetails();

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Backdrop close area */}
            <div className="flex-1" onClick={onClose} />

            <div className="w-full max-w-md bg-white dark:bg-[#0d0d0f] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/20">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${details.bg} ${details.color}`}>
                            {details.icon}
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 italic">Sync Telemetry</h2>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">CouchDB Protocol</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={onOpenSettings}
                            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                            title="Sync Settings"
                        >
                            <ShieldCheck size={20} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Primary Status Card */}
                    <div className={`p-5 rounded-2xl border ${details.bg.replace('/10', '/5')} border-zinc-200 dark:border-zinc-800 space-y-3`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-sm font-bold uppercase tracking-tight ${details.color}`}>{details.label}</span>
                            {syncStatus.lastSync && (
                                <span className="text-[10px] text-zinc-500 font-medium">
                                    {new Date(syncStatus.lastSync).toLocaleString()}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            {details.description}
                        </p>
                        <button
                            onClick={() => triggerSync(profileId)}
                            className="w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 group"
                            disabled={isLoading || syncStatus.status === 'syncing'}
                        >
                            <RefreshCw size={14} className={(isLoading || syncStatus.status === 'syncing') ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
                            Synchronize Now
                        </button>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                            <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1.5">
                                <History size={10} /> Last Push
                            </span>
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate block">
                                {syncStatus.lastSync ? 'Successful' : 'Never'}
                            </span>
                        </div>
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                            <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1.5">
                                <ShieldCheck size={10} /> Encryption
                            </span>
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 block">
                                AES-256-GCM
                            </span>
                        </div>
                    </div>

                    {/* Configuration Summary */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Endpoint Configuration</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Remote Instance</span>
                                <span className="text-zinc-900 dark:text-zinc-200 font-mono text-xs">{syncConfig?.remoteUrl || 'Not set'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Sync Mode</span>
                                <span className="text-zinc-900 dark:text-zinc-200 capitalize">{syncConfig?.syncDirection || 'Two-way'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Continuous Syncing</span>
                                <span className={`font-semibold ${syncConfig?.continuous ? 'text-emerald-500' : 'text-zinc-500'}`}>
                                    {syncConfig?.continuous ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Conflicts Preview */}
                    {syncStatus.status === 'conflict' && (
                        <div className="space-y-4 bg-amber-500/5 p-4 rounded-xl border border-amber-500/10">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500">Conflicts Detected</h3>
                                <button
                                    onClick={onResolveAll}
                                    className="text-[10px] font-bold text-amber-600 dark:text-amber-500 hover:underline flex items-center gap-1"
                                >
                                    Resolve All <ExternalLink size={10} />
                                </button>
                            </div>
                            <div className="space-y-2">
                                {conflicts.slice(0, 3).map((conflict, idx) => (
                                    <div key={idx} className="flex items-center justify-between py-2 border-b border-amber-500/10 last:border-0">
                                        <span className="text-xs text-zinc-900 dark:text-zinc-100 font-medium truncate max-w-[200px]">
                                            {conflict.ledgerName} / {conflict.entryName}
                                        </span>
                                        <button className="p-1 text-zinc-400 hover:text-red-500 transition-colors">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 mt-auto">
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Ledgy ensures your data remains private. All sync operations are performed
                        locally on your device. Credentials never leave this instance unencrypted.
                    </p>
                </div>
            </div>
        </div>
    );
};
