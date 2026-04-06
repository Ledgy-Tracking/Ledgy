import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
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
    LayoutDashboard,
    Plus,
    Grid3X3,
    Table,
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
import { SchemaBuilder } from '../../features/ledger/SchemaBuilder';
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
        toggleTheme,
        schemaBuilderOpen,
        setSchemaBuilderOpen
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
    const [dashboardViewMode, setDashboardViewMode] = useState<'grid' | 'table'>('grid');
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
        
        // Ensure sidebar is visible on app initialization
        setLeftSidebar(true);

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
        <div className="h-screen w-full flex flex-col bg-white dark:bg-zinc-950 overflow-hidden select-none">
            {/* Background Effects - matching auth pages */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] opacity-50 mix-blend-screen" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] opacity-30 mix-blend-screen" />
            </div>

            {/* < 900px warning banner */}
            {windowWidth < 900 && (
                <div className="relative z-10 flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-500 text-xs font-medium shrink-0">
                    <AlertTriangle size={14} />
                    Window too narrow. Ledgy is optimised for widths ≥ 900px.
                </div>
            )}
            <div className="relative z-10 flex flex-1 overflow-hidden">{/* Left Sidebar */}
                <aside
                    className={`flex flex-col bg-white dark:bg-zinc-900/50 backdrop-blur-xl border-r border-zinc-200 dark:border-white/5 transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${leftSidebarOpen ? 'w-64' : 'w-12'
                        }`}
                >
                    <div className={`flex items-center border-b border-zinc-200 dark:border-white/5 ${leftSidebarOpen ? 'p-4 justify-between' : 'p-2 justify-center'}`}>
                        <div className={`flex items-center gap-2 font-bold italic text-xl tracking-tighter text-zinc-900 dark:text-white ${!leftSidebarOpen ? 'hidden' : ''}`}>
                            <Network size={22} className="text-emerald-600 dark:text-emerald-400" />
                            LEDGY
                        </div>
                        {!leftSidebarOpen && <Network size={20} className="text-emerald-600 dark:text-emerald-400" />}
                    </div>

                    <nav className="flex-1 overflow-y-auto p-2 pt-6 space-y-2">
                        {/* Projects */}
                        <Button
                            variant="ghost"
                            onClick={() => navigate(`/app/${profileId}/projects`)}
                            title="Projects"
                            aria-label="Projects"
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ease-in-out group 
  border-b border-r 
  ${location.pathname.includes('/projects')
    ? 'text-emerald-600 dark:text-emerald-400 font-medium border-b-emerald-500 border-r-emerald-500 shadow-[4px_4px_20px_rgba(16,185,129,0.25)] dark:shadow-[4px_4px_20px_rgba(16,185,129,0.35)] rounded-br-lg bg-emerald-50/30 dark:bg-emerald-500/10'
    : 'text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-b-emerald-400/50 hover:border-r-emerald-400/50 hover:shadow-[4px_4px_16px_rgba(16,185,129,0.15)] dark:hover:shadow-[4px_4px_16px_rgba(16,185,129,0.2)]'
  } 
  ${!leftSidebarOpen ? 'justify-center px-0' : ''}`}
                        >
                            <FolderKanban size={18} className="shrink-0" />
                            {leftSidebarOpen && <span className="text-sm font-medium">Projects</span>}
                        </Button>

                        {/* Dashboard — requires a project in context */}
                        {projectId && (
                            <Button
                                variant="ghost"
                                onClick={() => navigate(`/app/${profileId}/project/${projectId}`)}
                                title="Dashboard"
                                aria-label="Dashboard"
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ease-in-out group 
  border-b border-r 
  ${location.pathname === `/app/${profileId}/project/${projectId}`
    ? 'text-emerald-600 dark:text-emerald-400 font-medium border-b-emerald-500 border-r-emerald-500 shadow-[4px_4px_20px_rgba(16,185,129,0.25)] dark:shadow-[4px_4px_20px_rgba(16,185,129,0.35)] rounded-br-lg bg-emerald-50/30 dark:bg-emerald-500/10'
    : 'text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-b-emerald-400/50 hover:border-r-emerald-400/50 hover:shadow-[4px_4px_16px_rgba(16,185,129,0.15)] dark:hover:shadow-[4px_4px_16px_rgba(16,185,129,0.2)]'
  } 
  ${!leftSidebarOpen ? 'justify-center px-0' : ''}`}
                            >
                                <LayoutDashboard size={18} className="shrink-0" />
                                {leftSidebarOpen && <span className="text-sm font-medium">Dashboard</span>}
                            </Button>
                        )}

                        {/* Ledgers for the current project */}
                        {leftSidebarOpen && projectId && (
                            <div className="space-y-0.5">
                                <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Ledgers</p>
                                {projectSchemas.map(schema => (
                                    <Button
                                    variant="ghost"
                                        key={schema._id}
                                        onClick={() => navigate(`/app/${profileId}/project/${projectId}/ledger/${schema._id}`)}
                                        title={schema.name}
                                        aria-label={schema.name}
                                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 ease-in-out text-left 
  border-b border-r 
  ${location.pathname.includes(schema._id)
    ? 'text-emerald-600 dark:text-emerald-400 font-medium border-b-emerald-500 border-r-emerald-500 shadow-[4px_4px_20px_rgba(16,185,129,0.25)] dark:shadow-[4px_4px_20px_rgba(16,185,129,0.35)] rounded-br-lg bg-emerald-50/30 dark:bg-emerald-500/10'
    : 'bg-transparent text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-b-emerald-400/50 hover:border-r-emerald-400/50 hover:shadow-[4px_4px_16px_rgba(16,185,129,0.15)] dark:hover:shadow-[4px_4px_16px_rgba(16,185,129,0.2)]'
  } 
  ${!leftSidebarOpen ? 'justify-center px-0' : ''}`}
                                    >
                                        <Database size={14} className="shrink-0" />
                                        <span className="text-xs font-medium truncate">{schema.name}</span>
                                    </Button>
                                ))}
                                <Button
                                    variant="ghost"
                                    onClick={() => setSchemaBuilderOpen(true)}
                                    title="New Ledger"
                                    aria-label="New Ledger"
                                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                                >
                                    <Plus size={14} className="shrink-0" />
                                    <span className="text-xs font-medium">+ New Ledger</span>
                                </Button>
                            </div>
                        )}

                        {/* Node Forge — requires a project in context */}
                        {projectId && (
                            <Button
                                variant="ghost"
                                onClick={() => navigate(`/app/${profileId}/project/${projectId}/node-forge`)}
                                title="Node Forge"
                                aria-label="Node Forge"
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ease-in-out group 
  border-b border-r 
  ${location.pathname.includes('/node-forge')
    ? 'text-emerald-600 dark:text-emerald-400 font-medium border-b-emerald-500 border-r-emerald-500 shadow-[4px_4px_20px_rgba(16,185,129,0.25)] dark:shadow-[4px_4px_20px_rgba(16,185,129,0.35)] rounded-br-lg bg-emerald-50/30 dark:bg-emerald-500/10'
    : 'text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-b-emerald-400/50 hover:border-r-emerald-400/50 hover:shadow-[4px_4px_16px_rgba(16,185,129,0.15)] dark:hover:shadow-[4px_4px_16px_rgba(16,185,129,0.2)]'
  } 
  ${!leftSidebarOpen ? 'justify-center px-0' : ''}`}
                            >
                                <Network size={18} className="shrink-0" />
                                {leftSidebarOpen && <span className="text-sm font-medium">Node Forge</span>}
                            </Button>
                        )}

                        {/* Trash */}
                        <Button
                            variant="ghost"
                            onClick={() => navigate(`/app/${profileId}/trash`)}
                            title="Trash"
                            aria-label="Trash"
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ease-in-out group 
  border-b border-r 
  ${location.pathname.includes('/trash')
    ? 'text-emerald-600 dark:text-emerald-400 font-medium border-b-emerald-500 border-r-emerald-500 shadow-[4px_4px_20px_rgba(16,185,129,0.25)] dark:shadow-[4px_4px_20px_rgba(16,185,129,0.35)] rounded-br-lg bg-emerald-50/30 dark:bg-emerald-500/10'
    : 'text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-b-emerald-400/50 hover:border-r-emerald-400/50 hover:shadow-[4px_4px_16px_rgba(16,185,129,0.15)] dark:hover:shadow-[4px_4px_16px_rgba(16,185,129,0.2)]'
  } 
  ${!leftSidebarOpen ? 'justify-center px-0' : ''}`}
                        >
                            <Trash2 size={18} className="shrink-0" />
                            {leftSidebarOpen && <span className="text-sm font-medium">Trash</span>}
                        </Button>
                    </nav>

                    {/* Sidebar Footer */}
                    <div className={`border-t border-zinc-200 dark:border-white/5 ${leftSidebarOpen ? 'p-3' : 'p-2'}`}>
                        {leftSidebarOpen && (
                            <div className="mb-3">
                                {/* Unified Profile Card */}
                                <div className="group rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all duration-200">
                                    <div className="flex items-center gap-3 p-2.5">
                                        {/* Profile Avatar */}
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                {profileName.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        
                                        {/* Profile Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Active Profile</div>
                                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                                {profileName}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Sync Status Row */}
                                    <div className="px-2.5 pb-2.5">
                                        <SyncStatusButton
                                            profileId={profileId || ''}
                                            onClick={() => setIsSyncSheetOpen(true)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        {!leftSidebarOpen && (
                            <div className="flex flex-col items-center gap-2 mb-3">
                                {/* Collapsed Profile Avatar with Status */}
                                <div className="relative">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                            {profileName.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full">
                                    <SyncStatusButton
                                        profileId={profileId || ''}
                                        onClick={() => setIsSyncSheetOpen(true)}
                                    />
                                </div>
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            onClick={() => navigate(`/app/${profileId}/settings`)}
                            title="Settings"
                            aria-label="Settings"
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ease-in-out group 
  border-b border-r 
  ${location.pathname.includes('/settings')
    ? 'text-emerald-600 dark:text-emerald-400 font-medium border-b-emerald-500 border-r-emerald-500 shadow-[4px_4px_20px_rgba(16,185,129,0.25)] dark:shadow-[4px_4px_20px_rgba(16,185,129,0.35)] rounded-br-lg bg-emerald-50/30 dark:bg-emerald-500/10'
    : 'text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-b-emerald-400/50 hover:border-r-emerald-400/50 hover:shadow-[4px_4px_16px_rgba(16,185,129,0.15)] dark:hover:shadow-[4px_4px_16px_rgba(16,185,129,0.2)]'
  } 
  ${!leftSidebarOpen ? 'justify-center px-0' : ''}`}
                        >
                            <Settings size={18} className="shrink-0" />
                            {leftSidebarOpen && <span className="text-sm font-medium">Settings</span>}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={handleLockVault}
                            title="Lock Vault"
                            aria-label="Lock Vault"
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ease-in-out group 
  border-b border-r 
  ${location.pathname.includes('/lock')
    ? 'text-red-600 dark:text-red-400 font-medium border-b-red-500 border-r-red-500 shadow-[4px_4px_20px_rgba(239,68,68,0.25)] dark:shadow-[4px_4px_20px_rgba(239,68,68,0.35)] rounded-br-lg bg-red-50/30 dark:bg-red-500/10'
    : 'text-red-600 dark:text-red-400 border-zinc-200 dark:border-zinc-800 hover:text-red-700 dark:hover:text-red-300 hover:border-b-red-400/50 hover:border-r-red-400/50 hover:shadow-[4px_4px_16px_rgba(239,68,68,0.15)] dark:hover:shadow-[4px_4px_16px_rgba(239,68,68,0.2)]'
  } 
  ${!leftSidebarOpen ? 'justify-center px-0' : ''}`}
                        >
                            <LogOut size={18} className="shrink-0" />
                            {leftSidebarOpen && <span className="text-sm font-medium">Lock Vault</span>}
                        </Button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 h-full flex flex-col min-w-0 bg-white dark:bg-zinc-950 relative">
                    {/* Header / Toolbar */}
                    <TooltipProvider delayDuration={300}>
                        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 bg-white/80 dark:bg-zinc-900/50 backdrop-blur-md z-10 shrink-0">
                            <div className="flex items-center gap-4">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={toggleLeftSidebar}
                                            aria-label={leftSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                                            className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        >
                                            {leftSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{leftSidebarOpen ? 'Close sidebar' : 'Open sidebar'}</p>
                                    </TooltipContent>
                                </Tooltip>
                                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
                                <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                    {activeProfile ? `Ledger: ${profileName}` : 'Select Profile'}
                                </h1>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* View Toggle Button - Only show on Dashboard route */}
                                {location.pathname === `/app/${profileId}/project/${projectId}` && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setDashboardViewMode(prev => prev === 'grid' ? 'table' : 'grid')}
                                                aria-label={dashboardViewMode === 'grid' ? 'Switch to Table View' : 'Switch to Grid View'}
                                                className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                            >
                                                {dashboardViewMode === 'grid' ? <Table size={18} /> : <Grid3X3 size={18} />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{dashboardViewMode === 'grid' ? 'Switch to Table View' : 'Switch to Grid View'}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={toggleTheme}
                                            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                                            className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        >
                                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</p>
                                    </TooltipContent>
                                </Tooltip>
                                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={toggleRightInspector}
                                            aria-label={rightInspectorOpen ? 'Close inspector' : 'Open inspector'}
                                            className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        >
                                            <PanelRightClose size={18} className={rightInspectorOpen ? '' : 'rotate-180'} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{rightInspectorOpen ? 'Close inspector' : 'Open inspector'}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </header>
                    </TooltipProvider>

                    {/* Viewport Content */}
                    <ScrollArea className="flex-1 p-6 bg-zinc-50 dark:bg-zinc-950">
                        <Outlet />
                    </ScrollArea>
                </main>

                {/* Right Inspector Panel */}
                <div
                    className={`h-full border-l border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${rightInspectorOpen ? 'w-80' : 'w-0 border-l-0'
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
                    <div className="fixed inset-0 z-[60] flex justify-end bg-white dark:bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="flex-1" onClick={() => setIsConflictListOpen(false)} />
                        <Card className="w-full max-w-md bg-gray-50 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                            <ConflictListSheet
                                conflicts={conflicts}
                                onSelectConflict={(c) => {
                                    setSelectedConflict(c);
                                    setIsConflictListOpen(false);
                                }}
                                onClose={() => setIsConflictListOpen(false)}
                            />
                        </Card>
                    </div>
                )}

                {/* Diff Guard Modal */}
                {selectedConflict && (
                    <DiffGuardModal
                        conflict={selectedConflict}
                        isOpen={!!selectedConflict}
                        onAcceptLocal={() => setSelectedConflict(null)}
                        onAcceptRemote={() => setSelectedConflict(null)}
                        onSkip={() => setSelectedConflict(null)}
                        onClose={() => setSelectedConflict(null)}
                    />
                )}

                {/* ARIA Live Region for Sync Announcements */}
                <div
                    aria-live="polite"
                    aria-atomic="true"
                    className="sr-only"
                >
                    {`Sync status changed to ${syncStatus.status}`}
                </div>

                <CommandPalette />

                {/* Schema Builder Modal */}
                {schemaBuilderOpen && projectId && (
                    <SchemaBuilder
                        projectId={projectId}
                        onClose={() => setSchemaBuilderOpen(false)}
                    />
                )}
            </div>
        </div>
    );
};
