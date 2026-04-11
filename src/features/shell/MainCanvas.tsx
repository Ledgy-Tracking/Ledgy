import { Outlet, useMatch } from 'react-router-dom';

export const MainCanvas = () => {
    const isNodeForge = useMatch('/app/:profileId/project/:projectId/node-forge/:workflowId');

    if (isNodeForge) {
        return (
            <main
                className="flex-1 overflow-hidden bg-white dark:bg-zinc-950"
                style={{ height: '100dvh', width: '100%' }}
            >
                <Outlet />
            </main>
        );
    }

    return (
        <main
            className="flex-1 overflow-auto transition-all duration-300 ease-in-out bg-white dark:bg-zinc-950"
        >
            <div className="min-h-full p-6">
                <Outlet />
                {/* Loading state placeholder for route transitions */}
                <div className="hidden" aria-live="polite" aria-busy="false">
                    <span className="sr-only">Loading content...</span>
                </div>
            </div>
        </main>
    );
};
