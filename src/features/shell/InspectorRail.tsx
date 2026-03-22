import { useUIStore } from '../../stores/useUIStore';
import { ChevronRight, ChevronLeft, Settings, Info } from 'lucide-react';

export const InspectorRail = () => {
    const inspectorOpen = useUIStore((state) => state.rightInspectorOpen);
    const toggleInspector = useUIStore((state) => state.toggleRightInspector);

    return (
        <aside
            className={`
                flex flex-col border-l border-white/5
                bg-zinc-900/50 backdrop-blur-xl
                transition-all duration-300 ease-in-out
                ${inspectorOpen ? 'w-72' : 'w-0'}
                ${!inspectorOpen && 'overflow-hidden'}
                hidden md:block
            `}
        >
            {/* Inspector Header */}
            <div className={`flex items-center justify-between p-4 border-b border-white/5 ${!inspectorOpen && 'hidden'}`}>
                <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-emerald-400" />
                    <span className="font-semibold text-white">Inspector</span>
                </div>
                <button
                    onClick={toggleInspector}
                    className="p-1 rounded hover:bg-zinc-800/50 transition-all duration-300 ease-in-out"
                    aria-label="Collapse inspector"
                >
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>
            </div>

            {/* Inspector Content - Placeholder for contextual tools */}
            <div className={`flex-1 overflow-y-auto p-4 ${!inspectorOpen && 'hidden'}`}>
                <div className="text-sm text-zinc-400">
                    <div className="flex items-start gap-3 p-3 bg-emerald-500/20 rounded-lg ring-1 ring-emerald-500/30">
                        <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-emerald-300 mb-1">Contextual Tools</p>
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
            <div className={`absolute -left-3 top-1/2 transform -translate-y-1/2 ${inspectorOpen && 'hidden'}`}>
                <button
                    onClick={toggleInspector}
                    className="p-1.5 rounded-full bg-zinc-900 border border-white/10 shadow-md hover:bg-zinc-800/50 transition-all duration-300 ease-in-out"
                    aria-label="Expand inspector"
                >
                    <ChevronLeft className="w-4 h-4 text-zinc-400" />
                </button>
            </div>
        </aside>
    );
};
