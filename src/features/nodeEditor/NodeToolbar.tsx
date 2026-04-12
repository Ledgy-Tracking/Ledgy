import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Database, Network, Calculator, Zap, MonitorPlay, Save, Check, AlertCircle, Loader2, Group, Ungroup } from 'lucide-react';
import { useReactFlow, useOnSelectionChange } from '@xyflow/react';
import { useNodeStore } from '../../stores/useNodeStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { useParams } from 'react-router-dom';

interface NodeToolbarProps { }

export const NodeToolbar: React.FC<NodeToolbarProps> = () => {
    const { addNodes, getNodes } = useReactFlow();

    const activeProfileId = useProfileStore(s => s.activeProfileId);
    const { projectId, workflowId } = useParams<{ projectId: string; workflowId: string }>();
    const isSaveInProgress = useNodeStore(s => s.isSaveInProgress);
    const lastSavedAt = useNodeStore(s => s.lastSavedAt);
    const saveError = useNodeStore(s => s.saveError);
    const isCanvasLoaded = useNodeStore(s => s.isCanvasLoaded);
    
    // Selection state for grouping (Story 4.9)
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
    
    useOnSelectionChange({
        onChange: ({ nodes }) => {
            setSelectedNodeIds(nodes.map(n => n.id));
        },
    });
    
    // Check if we can group (2+ nodes selected, none are containers)
    const canGroup = selectedNodeIds.length >= 2;
    
    // Check if a container is selected for ungrouping
    const nodes = getNodes();
    const selectedContainer = nodes.find(n => selectedNodeIds.includes(n.id) && n.type === 'container');
    const canUngroup = !!selectedContainer;

    // Briefly show "Saved" indicator then fade to nothing
    const [showSaved, setShowSaved] = useState(false);
    useEffect(() => {
        if (!lastSavedAt) return;
        setShowSaved(true);
        const t = setTimeout(() => setShowSaved(false), 2000);
        return () => clearTimeout(t);
    }, [lastSavedAt]);

    const handleManualSave = useCallback(() => {
        if (!activeProfileId || !projectId || !workflowId || !isCanvasLoaded) return;
        const state = useNodeStore.getState();
        state.clearDebouncedSave();
        const { nodes, edges, viewport, viewControls } = state;
        state.saveCanvasWithRetry(
            { profileId: activeProfileId, projectId, workflowId },
            { nodes, edges, viewport, viewControls }
        );
    }, [activeProfileId, projectId, workflowId, isCanvasLoaded]);

    const addNode = (type: 'ledgerSource' | 'correlation' | 'arithmetic' | 'trigger' | 'dashboardOutput') => {
        const existingCount = getNodes().length;
        const id = `${type}-${Date.now()}`;
        const newNode = {
            id,
            type,
            position: { x: 150 + existingCount * 20, y: 150 + existingCount * 20 },
            data: {
                label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
                operation: type === 'arithmetic' ? 'sum' : undefined,
                eventType: type === 'trigger' ? 'on-create' : undefined,
                status: type === 'trigger' ? 'armed' : undefined,
                widgetType: type === 'dashboardOutput' ? 'text' : undefined,
                title: type === 'dashboardOutput' ? 'Live Output' : undefined,
            },
        };
        addNodes([newNode]);
    };
    
    // Group selected nodes (Story 4.9)
    const handleGroup = useCallback(() => {
        if (selectedNodeIds.length >= 2) {
            useNodeStore.getState().groupNodes(selectedNodeIds);
        }
    }, [selectedNodeIds]);
    
    // Ungroup selected container (Story 4.9)
    const handleUngroup = useCallback(() => {
        if (selectedContainer) {
            useNodeStore.getState().ungroupNodes(selectedContainer.id);
        }
    }, [selectedContainer]);

    const saveStatusIcon = saveError
        ? <AlertCircle size={13} className="text-red-400" />
        : isSaveInProgress
            ? <Loader2 size={13} className="animate-spin text-amber-400" />
            : showSaved
                ? <Check size={13} className="text-emerald-400" />
                : null;

    const saveStatusLabel = saveError
        ? 'Save failed'
        : isSaveInProgress
            ? 'Saving...'
            : showSaved
                ? 'Saved'
                : 'Save';

    return (
        <Card className="absolute top-4 left-4 z-10 flex flex-col gap-2 p-2 bg-gray-50 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl">
            <CardContent className="p-0 flex flex-col gap-2">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase px-2 mb-1">Nodes</h3>
                <ToolbarButton icon={<Database size={16} />} label="Ledger Source" onClick={() => addNode('ledgerSource')} color="text-emerald-400" />
                <ToolbarButton icon={<Network size={16} />} label="Correlation" onClick={() => addNode('correlation')} color="text-blue-400" />
                <ToolbarButton icon={<Calculator size={16} />} label="Arithmetic" onClick={() => addNode('arithmetic')} color="text-amber-400" />
                <ToolbarButton icon={<Zap size={16} />} label="Trigger" onClick={() => addNode('trigger')} color="text-purple-400" />
                <ToolbarButton icon={<MonitorPlay size={16} />} label="Dashboard Output" onClick={() => addNode('dashboardOutput')} color="text-pink-400" />

                <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
                
                {/* Group/Ungroup Buttons (Story 4.9) */}
                {canGroup && (
                    <ToolbarButton 
                        icon={<Group size={16} />} 
                        label={`Group ${selectedNodeIds.length}`} 
                        onClick={handleGroup} 
                        color="text-emerald-400" 
                    />
                )}
                {canUngroup && (
                    <ToolbarButton 
                        icon={<Ungroup size={16} />} 
                        label="Ungroup" 
                        onClick={handleUngroup} 
                        color="text-orange-400" 
                    />
                )}
                {(canGroup || canUngroup) && (
                    <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
                )}

                <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start gap-3 hover:bg-gray-200 dark:hover:bg-zinc-800 h-9 px-3 disabled:opacity-50"
                    onClick={handleManualSave}
                    disabled={isSaveInProgress || !isCanvasLoaded}
                    title="Save workflow (Ctrl+S)"
                >
                    <span className={saveError ? 'text-red-400' : 'text-zinc-400'}>
                        {saveStatusIcon ?? <Save size={16} />}
                    </span>
                    <span className={`text-xs font-medium ${
                        saveError ? 'text-red-400' : showSaved ? 'text-emerald-400' : 'text-zinc-300'
                    }`}>
                        {saveStatusLabel}
                    </span>
                </Button>
            </CardContent>
        </Card>
    );
};

interface ToolbarButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    color: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ icon, label, onClick, color }) => (
    <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-3 hover:bg-gray-200 dark:hover:bg-zinc-800 h-9 px-3"
        onClick={onClick}
        title={label}
    >
        <span className={color}>{icon}</span>
        <span className="text-xs font-medium text-zinc-300">{label}</span>
    </Button>
);
