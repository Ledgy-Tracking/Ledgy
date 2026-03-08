import { ErrorBoundary } from '../shell/ErrorBoundary';
import { AuthGuard } from '../auth/AuthGuard';
import { Sidebar } from './Sidebar';
import { MainCanvas } from './MainCanvas';
import { InspectorRail } from './InspectorRail';
import { useUIStore } from '../../stores/useUIStore';
import { useEffect } from 'react';

export const AppShell = () => {
    const theme = useUIStore((state) => state.theme);

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
                <div className={`flex h-screen w-full overflow-hidden bg-gray-50 dark:bg-gray-900 ${theme}`}>
                    {/* Sidebar - Left Panel */}
                    <Sidebar />

                    {/* Main Canvas - Center Panel */}
                    <MainCanvas />

                    {/* Inspector Rail - Right Panel */}
                    <InspectorRail />
                </div>
            </AuthGuard>
        </ErrorBoundary>
    );
};
