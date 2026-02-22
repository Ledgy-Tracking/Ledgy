import React from 'react';
import { Plus, MousePointer2, Move } from 'lucide-react';

export const EmptyCanvasGuide: React.FC = () => {
    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-8 max-w-md text-center shadow-2xl">
                <h2 className="text-2xl font-bold text-emerald-400 mb-4">
                    Welcome to Node Forge
                </h2>
                <p className="text-zinc-400 mb-6">
                    Create visual automations by dragging nodes onto the canvas and wiring them together.
                </p>

                <div className="space-y-4 text-left">
                    <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                            <Plus size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-zinc-200">Add Your First Node</h3>
                            <p className="text-sm text-zinc-400">
                                Drag a ledger source node from the left panel onto the canvas
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                        <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400">
                            <MousePointer2 size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-zinc-200">Connect Nodes</h3>
                            <p className="text-sm text-zinc-400">
                                Drag from output ports to input ports to create data flows
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                            <Move size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-zinc-200">Navigate Canvas</h3>
                            <p className="text-sm text-zinc-400">
                                Hold <kbd className="px-2 py-0.5 bg-zinc-700 rounded text-xs">Space</kbd> + drag to pan, scroll to zoom
                            </p>
                        </div>
                    </div>
                </div>

                <p className="text-xs text-zinc-500 mt-6">
                    This guide will disappear once you add your first node
                </p>
            </div>
        </div>
    );
};
