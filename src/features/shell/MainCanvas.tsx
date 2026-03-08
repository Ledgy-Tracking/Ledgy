import { Outlet } from 'react-router-dom';

export const MainCanvas = () => {
    return (
        <main
            className={`
                flex-1 overflow-auto
                transition-all duration-300 ease-in-out
                bg-gray-50 dark:bg-gray-900
            `}
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
