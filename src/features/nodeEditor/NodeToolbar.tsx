import React from 'react';
import { Button } from '../../components/ui/button';
import { Database, Network, Calculator, Zap, MonitorPlay } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

interface NodeToolbarProps { }

export const NodeToolbar: React.FC<NodeToolbarProps> = () => {
    const { addNodes, getNodes } = useReactFlow();

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

    return (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 p-2 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl shadow-2xl">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase px-2 mb-1">Nodes</h3>
            <ToolbarButton icon={<Database size={16} />} label="Ledger Source" onClick={() => addNode('ledgerSource')} color="text-emerald-400" />
            <ToolbarButton icon={<Network size={16} />} label="Correlation" onClick={() => addNode('correlation')} color="text-blue-400" />
            <ToolbarButton icon={<Calculator size={16} />} label="Arithmetic" onClick={() => addNode('arithmetic')} color="text-amber-400" />
            <ToolbarButton icon={<Zap size={16} />} label="Trigger" onClick={() => addNode('trigger')} color="text-purple-400" />
            <ToolbarButton icon={<MonitorPlay size={16} />} label="Dashboard Output" onClick={() => addNode('dashboardOutput')} color="text-pink-400" />
        </div>
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
        className="justify-start gap-3 hover:bg-zinc-800 h-9 px-3"
        onClick={onClick}
        title={label}
    >
        <span className={color}>{icon}</span>
        <span className="text-xs font-medium text-zinc-300">{label}</span>
    </Button>
);
