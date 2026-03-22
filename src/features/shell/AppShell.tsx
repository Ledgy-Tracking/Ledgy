import { ErrorBoundary } from '../shell/ErrorBoundary';
import { AuthGuard } from '../auth/AuthGuard';
import { Sidebar } from './Sidebar';
import { MainCanvas } from './MainCanvas';
import { InspectorRail } from './InspectorRail';
import { useUIStore } from '../../stores/useUIStore';
import { useEffect } from 'react';
import { useUndoRedoShortcuts } from '../../hooks/useUndoRedoShortcuts';

export const AppShell = () => {
    const theme = useUIStore((state) => state.theme);
    useUndoRedoShortcuts();

    // Keyboard shortcuts for panel toggling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+B for sidebar (or Ctrl+B on Windows)
            if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                e.preventDefault();
                useUIStore.getState().toggleLeftSidebar();
            }
            // Cmd+I for inspector (or Ctrl+I on Windows)
            if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
                e.preventDefault();
                useUIStore.getState().toggleRightInspector();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <ErrorBoundary>
            <AuthGuard>
                <div className={`flex h-screen w-full overflow-hidden bg-zinc-950 ${theme}`}>
                    {/* Background Effects - matching auth pages */}
                    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] opacity-50 mix-blend-screen" />
                        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] opacity-30 mix-blend-screen" />
                    </div>
                    {/* Sidebar - Left Panel */}
                    <div className="relative z-10">
                        <Sidebar />
                    </div>

                    {/* Main Canvas - Center Panel */}
                    <div className="relative z-10 flex-1">
                        <MainCanvas />
                    </div>

                    {/* Inspector Rail - Right Panel */}
                    <div className="relative z-10">
                        <InspectorRail />
                    </div>
                </div>
            </AuthGuard>
        </ErrorBoundary>
    );
};
