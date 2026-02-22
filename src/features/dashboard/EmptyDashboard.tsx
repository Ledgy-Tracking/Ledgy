import React from 'react';
import { Plus, Sparkles } from 'lucide-react';

interface EmptyDashboardProps {
    onActionClick: () => void;
}

export const EmptyDashboard: React.FC<EmptyDashboardProps> = ({ onActionClick }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950/50 rounded-2xl border border-zinc-900 border-dashed text-center w-full max-w-lg">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
                <Sparkles size={32} className="text-emerald-500" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">Welcome to Ledgy!</h2>
            <p className="text-zinc-400 max-w-sm mb-8">
                Create your first ledger to get started tracking your data securely and privately.
            </p>
            <button
                onClick={onActionClick}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-2.5 px-6 rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
            >
                <Plus size={20} />
                <span>Create Ledger</span>
            </button>
        </div>
    );
};
