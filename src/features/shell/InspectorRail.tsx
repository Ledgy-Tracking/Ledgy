import { useUIStore } from '../../stores/useUIStore';
import { ChevronRight, ChevronLeft, Settings, Info } from 'lucide-react';

export const InspectorRail = () => {
    const inspectorOpen = useUIStore((state) => state.rightInspectorOpen);
    const toggleInspector = useUIStore((state) => state.toggleRightInspector);

    return (
        <aside
            className={`
                flex flex-col border-l border-gray-200 dark:border-gray-700
                bg-white dark:bg-gray-800
                transition-all duration-300 ease-in-out
                ${inspectorOpen ? 'w-72' : 'w-0'}
                ${!inspectorOpen && 'overflow-hidden'}
                hidden md:block
            `}
        >
            {/* Inspector Header */}
            <div className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 ${!inspectorOpen && 'hidden'}`}>
                <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <span className="font-semibold text-gray-900 dark:text-white">Inspector</span>
                </div>
                <button
                    onClick={toggleInspector}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Collapse inspector"
                >
                    <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
            </div>

            {/* Inspector Content - Placeholder for contextual tools */}
            <div className={`flex-1 overflow-y-auto p-4 ${!inspectorOpen && 'hidden'}`}>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">Contextual Tools</p>
                            <p className="text-xs">
                                The inspector will display tools and properties based on your current context:
                            </p>
                            <ul className="text-xs mt-2 space-y-1 list-disc list-inside">
                                <li>Schema properties in Schema Builder</li>
                                <li>Entry details in Ledger views</li>
                                <li>Node configuration in Node Forge</li>
                                <li>Widget settings in Dashboard</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toggle Button (when collapsed) */}
            <div className={`hidden absolute -left-3 top-1/2 ${inspectorOpen && 'hidden'}`}>
                <button
                    onClick={toggleInspector}
                    className="p-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Expand inspector"
                >
                    <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
            </div>
        </aside>
    );
};
