import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Outlet } from 'react-router-dom';
import {
    Settings,
    LogOut,
    PanelLeftClose,
    PanelLeftOpen,
    PanelRightClose,
    Sun,
    Moon,
    FolderKanban,
    Network,
    Trash2
} from 'lucide-react';
import { useProfileStore } from '../../stores/useProfileStore';
import { useSyncStore } from '../../stores/useSyncStore';
import { useUIStore } from '../../stores/useUIStore';
import { SyncStatusButton } from '../../features/sync/SyncStatusButton';
import { SyncConfigDialog } from '../../features/sync/SyncConfigDialog';
import { SyncStatusSheet } from '../../features/sync/SyncStatusSheet';
import { ConflictListSheet, ConflictEntry } from '../../features/sync/ConflictListSheet';
import { DiffGuardModal } from '../../features/sync/DiffGuardModal';
import { CommandPalette } from '../CommandPalette';

export const AppShell: React.FC = () => {
    const {
        leftSidebarOpen,
        rightInspectorOpen,
        toggleLeftSidebar,
        toggleRightInspector,
        setLeftSidebar,
        theme,
        toggleTheme
    } = useUIStore();

    const navigate = useNavigate();

    const [mounted, setMounted] = useState(false);
    const { profileId } = useParams();
    const prevWidthRef = React.useRef(window.innerWidth);
    const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
    const [isSyncSheetOpen, setIsSyncSheetOpen] = useState(false);
    const [isConflictListOpen, setIsConflictListOpen] = useState(false);
    const [selectedConflict, setSelectedConflict] = useState<ConflictEntry | null>(null);
    const { syncStatus, conflicts } = useSyncStore();

    // Fetch profile name for display
    const { profiles, fetchProfiles } = useProfileStore();
    const activeProfile = profiles.find(p => p.id === profileId);
    const profileName = activeProfile?.name || 'Personal';

    useEffect(() => {
        setMounted(true);
        fetchProfiles();

        const handleResize = () => {
            const width = window.innerWidth;
            const mobile = width < 900;

            if (mobile && prevWidthRef.current >= 900) {
                setLeftSidebar(false);
            }
            prevWidthRef.current = width;
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [fetchProfiles, setLeftSidebar]);

    if (!mounted) return null;

    return (
        <div className="h-screen w-full flex bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none">
            {/* Left Sidebar */}
            <aside
                className={`flex flex-col bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${leftSidebarOpen ? 'w-64' : 'w-0 border-r-0'
                    }`}
            >
                <div className="p-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2 font-bold italic text-xl tracking-tighter text-zinc-900 dark:text-zinc-100">
                        <Network size={22} className="text-zinc-900 dark:text-zinc-100" />
                        LEDGY
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                    <button
                        onClick={() => navigate(`/app/${profileId}/projects`)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${window.location.pathname.includes('/projects')
                            ? 'bg-zinc-200 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900'
                            }`}
                    >
                        <FolderKanban size={18} className="group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
                        <span className="text-sm font-medium">Projects</span>
                    </button>

                    <button
                        onClick={() => navigate(`/app/${profileId}/trash`)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${window.location.pathname.includes('/trash')
                            ? 'bg-zinc-200 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900'
                            }`}
                    >
                        <Trash2 size={18} className="group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
                        <span className="text-sm font-medium">Trash</span>
                    </button>

                    <button
                        onClick={() => navigate(`/app/${profileId}/node-forge`)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${window.location.pathname.includes('/node-forge')
                            ? 'bg-zinc-200 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900'
                            }`}
                    >
                        <Network size={18} className="group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
                        <span className="text-sm font-medium">Node Forge</span>
                    </button>
                    {/* Placeholder for other navigation if needed */}
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Active Profile</span>
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[120px]">
                                {profileName}
                            </span>
                        </div>
                        <SyncStatusButton
                            profileId={profileId || ''}
                            onClick={() => setIsSyncSheetOpen(true)}
                        />
                    </div>
                    <button
                        onClick={() => navigate(`/app/${profileId}/settings`)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900 rounded-lg transition-colors group"
                    >
                        <Settings size={18} />
                        <span className="text-sm font-medium">Settings</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors group">
                        <LogOut size={18} />
                        <span className="text-sm font-medium">Lock Vault</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 h-full flex flex-col min-w-0 bg-white dark:bg-zinc-900 relative">
                {/* Header / Toolbar */}
                <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleLeftSidebar}
                            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors"
                            aria-label={leftSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                        >
                            {leftSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                        </button>
                        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
                        <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {activeProfile ? `Ledger: ${profileName}` : 'Select Profile'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors"
                            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <div className="h-4 w-px bg-zinc-200 dark:border-zinc-800" />
                        <button
                            onClick={toggleRightInspector}
                            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors"
                            aria-label={rightInspectorOpen ? 'Close inspector' : 'Open inspector'}
                        >
                            <PanelRightClose size={18} className={rightInspectorOpen ? '' : 'rotate-180'} />
                        </button>
                    </div>
                </header>

                {/* Viewport Content */}
                <div className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-950 p-6">
                    <Outlet />
                </div>
            </main>

            {/* Right Inspector Panel */}
            <aside
                className={`h-full bg-zinc-50 dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${rightInspectorOpen ? 'w-[280px]' : 'w-0 border-l-0'
                    }`}
            >
                <div className="p-4 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Inspector</h2>
                        <button
                            onClick={toggleRightInspector}
                            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-500"
                        >
                            <PanelRightClose size={16} />
                        </button>
                    </div>

                    <div className="flex-1 text-zinc-400 text-xs italic">
                        Select an item to view properties...
                    </div>
                </div>
            </aside>

            {/* Sync Configuration Dialog */}
            <SyncConfigDialog
                profileId={profileId || ''}
                isOpen={isSyncDialogOpen}
                onClose={() => setIsSyncDialogOpen(false)}
            />

            {/* Sync Status Sheet */}
            <SyncStatusSheet
                profileId={profileId || ''}
                isOpen={isSyncSheetOpen}
                onClose={() => setIsSyncSheetOpen(false)}
                onOpenSettings={() => {
                    setIsSyncSheetOpen(false);
                    setIsSyncDialogOpen(true);
                }}
                onResolveAll={() => {
                    setIsSyncSheetOpen(false);
                    setIsConflictListOpen(true);
                }}
            />

            {/* Conflict List Sheet */}
            {isConflictListOpen && (
                <div className="fixed inset-0 z-[60] flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="flex-1" onClick={() => setIsConflictListOpen(false)} />
                    <div className="w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <ConflictListSheet
                            conflicts={conflicts}
                            onSelectConflict={(c) => {
                                setSelectedConflict(c);
                                setIsConflictListOpen(false);
                            }}
                            onClose={() => setIsConflictListOpen(false)}
                        />
                    </div>
                </div>
            )}

            {/* Diff Guard Modal */}
            {selectedConflict && (
                <DiffGuardModal
                    conflict={selectedConflict}
                    onAcceptLocal={() => setSelectedConflict(null)}
                    onAcceptRemote={() => setSelectedConflict(null)}
                    onSkip={() => setSelectedConflict(null)}
                    onClose={() => setSelectedConflict(null)}
                />
            )}

            {/* ARIA Live Region for Sync Announcements */}
            <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
            >
                {`Sync status changed to ${syncStatus.status}`}
            </div>

            <CommandPalette />
        </div>
    );
};
