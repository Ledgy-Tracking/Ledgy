import React from 'react';
import { Plus, MousePointer2, Move, Hand } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface EmptyCanvasGuideProps {
    onAddFirstNode?: () => void;
}

export const EmptyCanvasGuide: React.FC<EmptyCanvasGuideProps> = ({ onAddFirstNode }) => {
    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-10">
            <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-8 max-w-md text-center shadow-2xl backdrop-blur-sm">
                <div className="flex justify-center mb-4 relative h-16 w-16 mx-auto">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-xl animate-pulse" />
                    <Hand size={32} className="text-emerald-400 absolute inset-0 m-auto animate-bounce" />
                </div>
                <h2 className="text-2xl font-bold text-emerald-400 mb-4">
                    Welcome to Node Forge
                </h2>
                <p className="text-zinc-400 mb-6">
                    Create visual automations by connecting data sources to logic nodes. Let's get started.
                </p>

                {onAddFirstNode && (
                    <Button
                        onClick={onAddFirstNode}
                        size="lg"
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold mb-6 group transition-all"
                    >
                        <Plus className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                        Drop a Ledger Node
                    </Button>
                )}

                <div className="space-y-4 text-left border-t border-zinc-800 pt-6">
                    <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-cyan-500/10 rounded-md text-cyan-400 mt-0.5">
                            <MousePointer2 size={16} />
                        </div>
                        <div>
                            <h3 className="font-medium text-sm text-zinc-300">Connect Nodes</h3>
                            <p className="text-xs text-zinc-500">Drag from output ports to inputs</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-purple-500/10 rounded-md text-purple-400 mt-0.5">
                            <Move size={16} />
                        </div>
                        <div>
                            <h3 className="font-medium text-sm text-zinc-300">Navigate Canvas</h3>
                            <p className="text-xs text-zinc-500">Hold <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-300 border border-zinc-700">Space</kbd> + drag to pan</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
