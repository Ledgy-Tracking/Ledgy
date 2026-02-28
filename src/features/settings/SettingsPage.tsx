import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, Lock, RefreshCw, Shield, Database, Info } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';
import { useAuthStore } from '../auth/useAuthStore';
import { SyncConfigDialog } from '../sync/SyncConfigDialog';
import { useProfileStore } from '../../stores/useProfileStore';

export const SettingsPage: React.FC = () => {
    const { theme, toggleTheme } = useUIStore();
    const { lock } = useAuthStore();
    const { activeProfileId } = useProfileStore();
    const navigate = useNavigate();
    const [isSyncConfigOpen, setIsSyncConfigOpen] = useState(false);

    const handleLockVault = () => {
        lock();
        navigate('/unlock');
    };

    const handleResetTotp = () => {
        if (window.confirm('This will clear your TOTP secret and require you to set up a new authenticator. Are you sure?')) {
            useAuthStore.getState().reset();
            navigate('/setup');
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Manage your application preferences and security settings.
                </p>
            </div>

            {/* Appearance */}
            <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Appearance</h2>
                </div>
                <div className="px-6 py-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Theme</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Switch between dark and light mode.
                        </p>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-zinc-900 dark:text-zinc-100 transition-colors"
                    >
                        {theme === 'dark' ? (
                            <><Sun size={16} /> Light Mode</>
                        ) : (
                            <><Moon size={16} /> Dark Mode</>
                        )}
                    </button>
                </div>
            </section>

            {/* Security */}
            <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Security</h2>
                </div>

                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    <div className="px-6 py-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Lock Vault</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Immediately lock the app and require TOTP to re-enter.
                            </p>
                        </div>
                        <button
                            onClick={handleLockVault}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-zinc-900 dark:text-zinc-100 transition-colors"
                        >
                            <Lock size={16} />
                            Lock Now
                        </button>
                    </div>

                    <div className="px-6 py-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Re-enroll Authenticator</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Generate a new TOTP secret. You'll need to re-scan the QR code.
                            </p>
                        </div>
                        <button
                            onClick={handleResetTotp}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 rounded-lg text-sm font-medium text-amber-700 dark:text-amber-400 transition-colors"
                        >
                            <Shield size={16} />
                            Re-enroll
                        </button>
                    </div>
                </div>
            </section>

            {/* Sync */}
            <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Sync</h2>
                </div>
                <div className="px-6 py-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Remote Sync Configuration</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Connect to a CouchDB or PouchDB-compatible endpoint for sync.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsSyncConfigOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-zinc-900 dark:text-zinc-100 transition-colors"
                    >
                        <RefreshCw size={16} />
                        Configure Sync
                    </button>
                </div>
            </section>

            {/* About */}
            <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">About</h2>
                </div>
                <div className="px-6 py-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-2"><Info size={14} /> Version</span>
                        <span className="text-zinc-900 dark:text-zinc-100 font-mono text-xs">0.1.1</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-2"><Database size={14} /> Storage</span>
                        <span className="text-zinc-900 dark:text-zinc-100 text-xs">PouchDB (Local)</span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-2 italic">
                        Ledgy is 100% offline &amp; private. Your data never leaves your device unless you configure a sync endpoint.
                    </p>
                </div>
            </section>

            <SyncConfigDialog
                profileId={activeProfileId || ''}
                isOpen={isSyncConfigOpen}
                onClose={() => setIsSyncConfigOpen(false)}
            />
        </div>
    );
};
