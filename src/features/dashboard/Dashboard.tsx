import React from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { PanelRightOpen } from 'lucide-react';

export const Dashboard: React.FC = () => {
    const { toggleRightInspector, rightInspectorOpen } = useUIStore();

    return (
        <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-50 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900 shrink-0">
                <div className="flex-1 flex items-baseline gap-2">
                    <h1 className="text-sm font-semibold">Caffeine Log</h1>
                    <span className="text-xs text-zinc-400">· 12 entries</span>
                </div>

                <span className="text-[10px] font-mono bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-400">N</span>
                <button className="px-3 py-1.5 rounded text-xs font-medium bg-emerald-500 text-black hover:bg-emerald-400 transition-colors">
                    + Add Entry
                </button>
                <button className="px-3 py-1.5 rounded text-xs font-medium bg-transparent border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-50 transition-colors">
                    Filter
                </button>
                <button className="px-3 py-1.5 rounded text-xs font-medium bg-transparent border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-50 transition-colors">
                    ⟳ Sync
                </button>
                {!rightInspectorOpen && (
                    <button onClick={toggleRightInspector} className="ml-2 text-zinc-400 hover:text-zinc-200" title="Open Inspector">
                        <PanelRightOpen size={16} />
                    </button>
                )}
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-[13px] border-collapse">
                    <thead className="sticky top-0 bg-zinc-950 z-10">
                        <tr>
                            <th className="px-3.5 py-2 text-[11px] font-medium text-zinc-400 uppercase tracking-wide border-b border-zinc-800 cursor-pointer hover:text-zinc-200">Item</th>
                            <th className="px-3.5 py-2 text-[11px] font-medium text-zinc-400 uppercase tracking-wide border-b border-zinc-800 cursor-pointer hover:text-zinc-200">Amount (mg)</th>
                            <th className="px-3.5 py-2 text-[11px] font-medium text-zinc-400 uppercase tracking-wide border-b border-zinc-800 cursor-pointer hover:text-zinc-200">Time</th>
                            <th className="px-3.5 py-2 text-[11px] font-medium text-zinc-400 uppercase tracking-wide border-b border-zinc-800 cursor-pointer hover:text-zinc-200">Mood</th>
                            <th className="px-3.5 py-2 text-[11px] font-medium text-zinc-400 uppercase tracking-wide border-b border-zinc-800 cursor-pointer hover:text-zinc-200">Tags</th>
                            <th className="px-3.5 py-2 text-[11px] font-medium text-zinc-400 uppercase tracking-wide border-b border-zinc-800 cursor-pointer hover:text-zinc-200">Linked</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Add Row */}
                        <tr className="border-b border-zinc-800">
                            <td className="px-3.5 py-1.5"><input type="text" placeholder="Item name…" className="bg-zinc-800 border border-emerald-500 rounded px-2 py-1 text-[13px] text-zinc-50 w-full outline-none focus:ring-1 focus:ring-emerald-500" autoFocus /></td>
                            <td className="px-3.5 py-1.5"><input type="text" placeholder="mg…" className="bg-zinc-800 border border-emerald-500 rounded px-2 py-1 text-[13px] text-zinc-50 w-16 outline-none focus:ring-1 focus:ring-emerald-500" /></td>
                            <td className="px-3.5 py-1.5"></td>
                            <td className="px-3.5 py-1.5"></td>
                            <td className="px-3.5 py-1.5"></td>
                            <td className="px-3.5 py-1.5"></td>
                        </tr>
                        {/* Selected Row */}
                        {/* Normal Rows */}
                    </tbody>
                </table>
                <div className="flex flex-col items-center justify-center p-12 text-zinc-500 gap-4 mt-8">
                    <p className="text-sm">No entries yet — press N or + to begin</p>
                </div>
            </div>
        </div>
    );
};
