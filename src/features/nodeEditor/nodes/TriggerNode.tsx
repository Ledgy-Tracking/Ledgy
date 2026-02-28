import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useLedgerStore } from '../../../stores/useLedgerStore';
import { useNodeStore } from '../../../stores/useNodeStore';
import { Zap, AlertTriangle, CheckCircle } from 'lucide-react';

export interface TriggerNodeData {
    label: string;
    ledgerId?: string;
    ledgerName?: string;
    eventType: 'on-create' | 'on-edit';
    status: 'armed' | 'fired' | 'error';
    lastFired?: string;
    error?: string;
}

/**
 * Trigger Node - Listens for ledger events (On-Create / On-Edit)
 * Refactored to be passive (Story 4-4 cleanup)
 */
export const TriggerNode: React.FC<NodeProps> = React.memo(({ id, data, selected }) => {
    const { schemas } = useLedgerStore();
    const { updateNodeData } = useNodeStore();
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    const nodeData = data as unknown as TriggerNodeData;

    const handleLedgerChange = (ledgerId: string) => {
        const schema = schemas.find(s => s._id === ledgerId);
        if (schema) {
            updateNodeData(id, {
                ledgerId,
                ledgerName: schema.name,
                status: 'armed',
                error: undefined
            });
        }
    };

    const handleEventTypeChange = (eventType: 'on-create' | 'on-edit') => {
        updateNodeData(id, { eventType });
    };

    const getStatusIcon = () => {
        switch (nodeData.status) {
            case 'armed':
                return <CheckCircle size={14} className="text-emerald-400" />;
            case 'fired':
                return <Zap size={14} className="text-amber-400" />;
            case 'error':
                return <AlertTriangle size={14} className="text-red-400" />;
            default:
                return <Zap size={14} className="text-zinc-400" />;
        }
    };

    const getStatusText = () => {
        switch (nodeData.status) {
            case 'armed':
                return 'Armed';
            case 'fired':
                return `Fired: ${new Date(nodeData.lastFired || Date.now()).toLocaleTimeString()}`;
            case 'error':
                return `Error: ${nodeData.error || 'Unknown'}`;
            default:
                return 'Armed';
        }
    };

    return (
        <div
            className={`bg-zinc-900 border-2 rounded-lg shadow-lg min-w-[220px] ${selected ? 'border-emerald-500' : 'border-zinc-700'
                } ${nodeData.status === 'error' ? 'border-red-500/50' : ''}`}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded-t-md">
                <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <span className="text-sm font-semibold text-zinc-100">Trigger</span>
                </div>
                <button
                    onClick={() => setIsConfigOpen(!isConfigOpen)}
                    className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200"
                    title="Configure"
                >
                    ⚙️
                </button>
            </div>

            {/* Configuration Panel */}
            {isConfigOpen && (
                <div className="p-3 space-y-3 border-b border-zinc-700 bg-zinc-800/50">
                    {/* Ledger Selector */}
                    <div>
                        <label className="text-xs text-zinc-400 block mb-1">Listen to Ledger:</label>
                        <select
                            value={nodeData.ledgerId || ''}
                            onChange={(e) => handleLedgerChange(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">-- Choose a ledger --</option>
                            {schemas.map(schema => (
                                <option key={schema._id} value={schema._id}>
                                    {schema.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Event Type Selector */}
                    <div>
                        <label className="text-xs text-zinc-400 block mb-1">Event Type:</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEventTypeChange('on-create')}
                                className={`flex-1 px-2 py-1.5 text-xs rounded border transition-colors ${nodeData.eventType === 'on-create'
                                    ? 'bg-emerald-600 border-emerald-500 text-white'
                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                    }`}
                            >
                                On Create
                            </button>
                            <button
                                onClick={() => handleEventTypeChange('on-edit')}
                                className={`flex-1 px-2 py-1.5 text-xs rounded border transition-colors ${nodeData.eventType === 'on-edit'
                                    ? 'bg-emerald-600 border-emerald-500 text-white'
                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                    }`}
                            >
                                On Edit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Display */}
            <div className="px-3 py-2 bg-zinc-800/30">
                <div className="text-xs text-zinc-500 mb-1">Status</div>
                <div className={`text-sm ${nodeData.status === 'error' ? 'text-red-400' :
                    nodeData.status === 'fired' ? 'text-amber-400' :
                        'text-emerald-400'
                    }`}>
                    {getStatusText()}
                </div>
            </div>

            {/* Output Port */}
            <div className="p-3">
                <div className="relative flex justify-end">
                    <span className="text-xs text-zinc-400 mr-2">trigger</span>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="source-trigger-event"
                        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-zinc-900 hover:!bg-amber-400"
                        style={{ right: '-6px' }}
                    />
                </div>
            </div>
        </div>
    );
});
