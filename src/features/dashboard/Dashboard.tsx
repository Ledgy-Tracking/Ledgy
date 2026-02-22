import React from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { PanelRightOpen } from 'lucide-react';
import { EmptyDashboard } from './EmptyDashboard';

export const Dashboard: React.FC = () => {
    const { toggleRightInspector, rightInspectorOpen } = useUIStore();

    // TODO: Implement actual ledger detection when ledgers are implemented in Epic 3
    // For now, always show empty state as per Story 2.4 requirements
    const hasLedgers = false;

    const handleCreateLedger = () => {
        // Placeholder until Schema Builder is implemented (Epic 3)
        // Using a simple alert for now since notification system is meant for user feedback, not feature placeholders
        alert('Schema Builder will be available in Epic 3. This will let you define custom ledger schemas with field types.');
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-50 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900 shrink-0">
                <div className="flex-1 flex items-baseline gap-2">
                    <h1 className="text-sm font-semibold">Dashboard</h1>
                </div>

                {!rightInspectorOpen && (
                    <button onClick={toggleRightInspector} className="ml-2 text-zinc-400 hover:text-zinc-200" title="Open Inspector">
                        <PanelRightOpen size={16} />
                    </button>
                )}
            </div>

            {/* Table Area / Main Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center items-center">
                {!hasLedgers ? (
                    <EmptyDashboard onActionClick={handleCreateLedger} />
                ) : (
                    <div className="text-zinc-500">
                        {/* Future ledger view */}
                    </div>
                )}
            </div>
        </div>
    );
};
