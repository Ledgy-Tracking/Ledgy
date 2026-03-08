import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Outlet, useLocation } from 'react-router-dom';
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
    Trash2,
    Database,
    AlertTriangle,
} from 'lucide-react';
import { useProfileStore } from '../../stores/useProfileStore';
import { useSyncStore } from '../../stores/useSyncStore';
import { useUIStore } from '../../stores/useUIStore';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { SyncStatusButton } from '../../features/sync/SyncStatusButton';
import { SyncConfigDialog } from '../../features/sync/SyncConfigDialog';
import { SyncStatusSheet } from '../../features/sync/SyncStatusSheet';
import { ConflictListSheet, ConflictEntry } from '../../features/sync/ConflictListSheet';
import { DiffGuardModal } from '../../features/sync/DiffGuardModal';
import { CommandPalette } from '../CommandPalette';
import { nodeEngine } from '../../services/nodeEngine';
import { executeTrigger } from '../../services/triggerEngine';
import { Inspector } from '../Inspector/Inspector';
import { useErrorStore } from '../../stores/useErrorStore';
import { useNodeStore } from '../../stores/useNodeStore';

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
    const location = useLocation();

    const [mounted, setMounted] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const { profileId, projectId } = useParams<{ profileId: string; projectId: string }>();
    const prevWidthRef = React.useRef(window.innerWidth);
    const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
    const [isSyncSheetOpen, setIsSyncSheetOpen] = useState(false);
    const [isConflictListOpen, setIsConflictListOpen] = useState(false);
    const [selectedConflict, setSelectedConflict] = useState<ConflictEntry | null>(null);
    const { syncStatus, conflicts } = useSyncStore();
    const { lock } = useAuthStore();

    // Fetch profile name for display
    const { profiles, fetchProfiles } = useProfileStore();
    const activeProfile = profiles.find(p => p.id === profileId);
    const profileName = activeProfile?.name || 'Personal';

    // Load schemas for the sidebar ledger list
    const { schemas, fetchSchemas } = useLedgerStore();
    // Ledgers scoped to the current project (if one is active in URL)
    const projectSchemas = projectId ? schemas.filter(s => s.projectId === projectId) : [];

    useEffect(() => {
        setMounted(true);
        fetchProfiles();

        const handleResize = () => {
            const width = window.innerWidth;
            setWindowWidth(width);
            if (width < 900 && prevWidthRef.current >= 900) {
                setLeftSidebar(false);
            }
            prevWidthRef.current = width;
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [fetchProfiles, setLeftSidebar]);

    // Load schemas whenever profileId or projectId changes
    useEffect(() => {
        if (profileId) fetchSchemas(profileId);
    }, [profileId, projectId, fetchSchemas]);

    const { dispatchError } = useErrorStore();

    // Wire up Node Engine and Trigger Engine to ledger events (GAP-21)
    useEffect(() => {
        if (!profileId || !projectId) return;

        const { setOnEntryEvent } = useLedgerStore.getState();
        setOnEntryEvent(async (eventType, entry) => {
            // 1. Re-execute the whole project graph for live updates
            await nodeEngine.executeProjectGraph();

            // 2. Handle specific Trigger nodes
            const { nodes } = useNodeStore.getState();
            const matchingTriggers = nodes.filter(n =>
                n.type === 'trigger' &&
                n.data.ledgerId === entry.ledgerId &&
                (n.data as any).eventType === eventType
            );

            for (const trigger of matchingTriggers) {
                try {
                    await executeTrigger({
                        triggerId: trigger.id,
                        entryId: entry._id,
                        ledgerId: entry.ledgerId,
                        eventType,
                        depth: 0,
                        profileId,
                        projectId,
                        data: entry.data
                    });
                } catch (err: any) {
                    dispatchError(`Trigger failed: ${err.message}`);
                }
            }
        });

        // Also initial run to sync dashboard if data exists
        nodeEngine.executeProjectGraph();

        return () => {
            setOnEntryEvent(() => { });
        };
    }, [profileId, projectId, dispatchError]);

    if (!mounted) return null;

    const handleLockVault = () => {
        lock();
        navigate('/unlock');
    };

    return (
        <div className="h-screen w-full flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none">
            {/* < 900px warning banner */}
            {windowWidth < 900 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-500 text-xs font-medium shrink-0">
                    <AlertTriangle size={14} />
                    Window too narrow. Ledgy is optimised for widths ≥ 900px.
                </div>
            )}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar */}
                <aside
                    className={`flex flex-col bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${leftSidebarOpen ? 'w-64' : 'w-12'
                        }`}
                >
                    <div className={`flex items-center border-b border-zinc-200 dark:border-zinc-800 ${leftSidebarOpen ? 'p-4 justify-between' : 'p-2 justify-center'}`}>
                        <div className={`flex items-center gap-2 font-bold italic text-xl tracking-tighter text-zinc-900 dark:text-zinc-100 ${!leftSidebarOpen ? 'hidden' : ''}`}>
                            <Network size={22} className="text-zinc-900 dark:text-zinc-100" />
                            LEDGY
                        </div>
                        {!leftSidebarOpen && <Network size={20} className="text-zinc-900 dark:text-zinc-100" />}
                    </div>

                    <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                        {/* Projects */}
                        <button
                            onClick={() => navigate(`/app/${profileId}/projects`)}
                            title="Projects"
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${location.pathname.includes('/projects')
                                ? 'bg-zinc-200 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900'
                                } ${!leftSidebarOpen ? 'justify-center px-0' : ''}`}
                        >
                            <FolderKanban size={18} className="shrink-0 group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
                            {leftSidebarOpen && <span className="text-sm font-medium">Projects</span>}
                        </button>

                        {/* Ledgers for the current project */}
                        {leftSidebarOpen && projectId && projectSchemas.length > 0 && (
                            <div className="pl-4 space-y-0.5">
                                <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Ledgers</p>
                                {projectSchemas.map(schema => (
                                    <button
                                        key={schema._id}
                                        onClick={() => navigate(`/app/${profileId}/project/${projectId}/ledger/${schema._id}`)}
                                        title={schema.name}
                                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-left ${location.pathname.includes(schema._id)
                                            ? 'bg-zinc-200 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                                            : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900'
                                            }`}
                                    >
                                        <Database size={14} className="shrink-0" />
                                        <span className="text-xs font-medium truncate">{schema.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Node Forge — requires a project in context */}
                        {projectId && (
                            <button
                                onClick={() => navigate(`/app/${profileId}/project/${projectId}/node-forge`)}
                                title="Node Forge"
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${location.pathname.includes('/node-forge')
                                    ? 'bg-zinc-200 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900'
                                    } ${!leftSidebarOpen ? 'justify-center px-0' : ''}`}
                            >
                                <Network size={18} className="shrink-0 group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
                                {leftSidebarOpen && <span className="text-sm font-medium">Node Forge</span>}
                            </button>
                        )}

                        {/* Trash */}
                        <button
                            onClick={() => navigate(`/app/${profileId}/trash`)}
                            title="Trash"
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${location.pathname.includes('/trash')
                                ? 'bg-zinc-200 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900'
                                } ${!leftSidebarOpen ? 'justify-center px-0' : ''}`}
                        >
                            <Trash2 size={18} className="shrink-0 group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
                            {leftSidebarOpen && <span className="text-sm font-medium">Trash</span>}
                        </button>
                    </nav>

                    {/* Sidebar Footer */}
                    <div className={`border-t border-zinc-200 dark:border-zinc-800 space-y-1 ${leftSidebarOpen ? 'p-4' : 'p-2'}`}>
                        {leftSidebarOpen && (
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
                        )}
                        {!leftSidebarOpen && (
                            <div className="flex justify-center mb-1">
                                <SyncStatusButton
                                    profileId={profileId || ''}
                                    onClick={() => setIsSyncSheetOpen(true)}
                                />
                            </div>
                        )}
                        <button
                            onClick={() => navigate(`/app/${profileId}/settings`)}
                            title="Settings"
                            className={`w-full flex items-center gap-3 px-3 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900 rounded-lg transition-colors group ${!leftSidebarOpen ? 'justify-center px-0' : ''}`}
                        >
                            <Settings size={18} className="shrink-0" />
                            {leftSidebarOpen && <span className="text-sm font-medium">Settings</span>}
                        </button>
                        <button
                            onClick={handleLockVault}
                            title="Lock Vault"
                            className={`w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors group ${!leftSidebarOpen ? 'justify-center px-0' : ''}`}
                        >
                            <LogOut size={18} className="shrink-0" />
                            {leftSidebarOpen && <span className="text-sm font-medium">Lock Vault</span>}
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
                <div
                    className={`h-full border-l border-zinc-200 dark:border-zinc-800 transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${rightInspectorOpen ? 'w-80' : 'w-0 border-l-0'
                        }`}
                >
                    <Inspector />
                </div>

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
        </div>
    );
};
