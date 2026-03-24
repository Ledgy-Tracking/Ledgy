import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, Shield, Globe, User, Key, ArrowRightLeft, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSyncStore } from '../../stores/useSyncStore';

interface SyncConfigDialogProps {
    profileId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const SyncConfigDialog: React.FC<SyncConfigDialogProps> = ({ profileId, isOpen, onClose }) => {
    const { syncConfig, isLoading, loadSyncConfig, saveSyncConfig } = useSyncStore();

    const [remoteUrl, setRemoteUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [syncDirection, setSyncDirection] = useState<'upload' | 'two-way'>('two-way');
    const [continuous, setContinuous] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadSyncConfig(profileId);
        }
    }, [isOpen, profileId, loadSyncConfig]);

    useEffect(() => {
        if (syncConfig) {
            setRemoteUrl(syncConfig.remoteUrl || '');
            setUsername(syncConfig.username || '');
            setPassword(syncConfig.password || '');
            setSyncDirection(syncConfig.syncDirection || 'two-way');
            setContinuous(syncConfig.continuous !== undefined ? syncConfig.continuous : true);
        }
    }, [syncConfig]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        await saveSyncConfig(profileId, {
            remoteUrl,
            username,
            password,
            syncDirection,
            continuous
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 dark:bg-black/70 backdrop-blur-sm p-4">
            <form
                onSubmit={handleSave}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 rounded-lg">
                            <RefreshCw size={24} />
                        </div>
                        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Sync Configuration</h2>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        type="button"
                        onClick={onClose}
                        className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                        aria-label="Close Sync Configuration"
                    >
                        <X size={20} />
                    </Button>
                </div>

                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 mb-6 flex gap-3">
                    <Shield className="text-amber-600 dark:text-amber-500 shrink-0" size={20} />
                    <p className="text-sm text-amber-800 dark:text-amber-400">
                        Credentials are encrypted with your profile key before being stored locally.
                        Only you can access the sync endpoint.
                    </p>
                </div>

                <div className="space-y-4 mb-8">
                    <div>
                        <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 flex items-center gap-2">
                            <Globe size={14} /> CouchDB Remote URL
                        </label>
                        <Input
                            type="url"
                            required
                            autoComplete="off"
                            placeholder="https://your-couchdb-instance.com/db-name"
                            value={remoteUrl}
                            onChange={(e) => setRemoteUrl(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 flex items-center gap-2">
                                <User size={14} /> Username
                            </label>
                            <Input
                                type="text"
                                autoComplete="off"
                                placeholder="Admin"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 flex items-center gap-2">
                                <Key size={14} /> Password
                            </label>
                            <Input
                                type="password"
                                autoComplete="off"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Sync Direction</label>
                            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                                <Button
                                    type="button"
                                    onClick={() => setSyncDirection('two-way')}
                                    variant="ghost"
                                    size="sm"
                                    className={`flex-1 text-xs ${syncDirection === 'two-way'
                                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                                        }`}
                                >
                                    <ArrowRightLeft size={14} /> Two-way
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setSyncDirection('upload')}
                                    variant="ghost"
                                    size="sm"
                                    className={`flex-1 text-xs ${syncDirection === 'upload'
                                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                                        }`}
                                >
                                    <Upload size={14} /> Upload only
                                </Button>
                            </div>
                        </div>
                        <div className="flex flex-col justify-end">
                            <label className="flex items-center gap-3 p-2.5 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={continuous}
                                        onChange={(e) => setContinuous(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                </div>
                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors">Continuous Sync</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="ghost"
                        className="text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={!remoteUrl || isLoading}
                        variant="default"
                        className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={18} />
                        )}
                        Save Configuration
                    </Button>
                </div>
            </form>
        </div>
    );
};
