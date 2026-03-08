import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { Settings, Info, Hash, Type, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useNodes, useReactFlow } from '@xyflow/react';

export const NodeInspector: React.FC = () => {
    const { selectedNodeId, setSelectedNodeId } = useUIStore();
    const nodes = useNodes();
    const { updateNodeData } = useReactFlow();

    // Read directly from React Flow's state since NodeCanvas uses local state
    const node = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;
    const [label, setLabel] = useState('');

    useEffect(() => {
        if (node) {
            setLabel((node.data.label as string) || '');
        }
    }, [node]);

    if (!node) {
        return (
            <div className="p-8 text-center text-zinc-500">
                <Info className="mx-auto mb-2 opacity-20" size={48} />
                <p className="text-sm">Select a node to inspect its properties.</p>
            </div>
        );
    }

    const handleLabelChange = (val: string) => {
        setLabel(val);
        if (node) {
            updateNodeData(node.id, { label: val });
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50">
                <Settings size={16} className="text-zinc-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Node Inspector</h2>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-6">
                <div className="space-y-2">
                    <Label className="text-xs text-zinc-500">Node Type</Label>
                    <div className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-mono text-zinc-600 dark:text-zinc-400">
                        {node.type}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-zinc-500">Label</Label>
                    <Input
                        value={label}
                        onChange={(e) => handleLabelChange(e.target.value)}
                        className="bg-white dark:bg-zinc-900"
                    />
                </div>

                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <p className="text-[10px] text-zinc-400 uppercase font-bold mb-4">Metadata</p>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500 flex items-center gap-1.5"><Hash size={12} /> ID</span>
                            <span className="text-zinc-900 dark:text-zinc-100 font-mono">{node.id.slice(-8)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500 flex items-center gap-1.5"><Type size={12} /> Data Fields</span>
                            <span className="text-zinc-900 dark:text-zinc-100">{Object.keys(node.data).length}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
                <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={() => {
                        // Node deletion logic would go here if not already in CanvasNode
                        setSelectedNodeId(null);
                    }}
                >
                    <Trash2 size={16} />
                    Delete Node
                </Button>
            </div>
        </div>
    );
};
