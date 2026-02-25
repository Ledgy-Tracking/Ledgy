import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useLedgerStore } from '../../../stores/useLedgerStore';
import { useProfileStore } from '../../../stores/useProfileStore';
import { LedgerSchema } from '../../types/ledger';
import { ChevronDown, ChevronUp, Database } from 'lucide-react';

export interface LedgerSourceNodeData {
    label: string;
    ledgerId?: string;
    ledgerName?: string;
    ports?: Array<{
        id: string;
        type: 'text' | 'number' | 'date' | 'relation';
        fieldName: string;
    }>;
}

/**
 * Ledger Source Node - represents a ledger schema as a data source
 * Story 4-2: Ledger Source Nodes & Basic Wiring
 */
export const LedgerSourceNode: React.FC<NodeProps> = React.memo(({ id, data, selected }) => {
    const { schemas, fetchSchemas } = useLedgerStore();
    const { activeProfileId } = useProfileStore();
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);

    const nodeData = data as LedgerSourceNodeData;

    // Fetch schemas on mount for ledger selector
    useEffect(() => {
        if (activeProfileId && schemas.length === 0) {
            fetchSchemas(activeProfileId);
        }
    }, [activeProfileId, schemas.length, fetchSchemas]);

    // Update ports when ledger changes
    useEffect(() => {
        if (nodeData.ledgerId) {
            const schema = schemas.find(s => s._id === nodeData.ledgerId);
            if (schema) {
                const ports = schema.fields.map(field => ({
                    id: `port-${field.name}`,
                    type: field.type,
                    fieldName: field.name,
                }));
                // Update node data with ports
                data.ports = ports;
                data.ledgerName = schema.name;
            }
        }
    }, [nodeData.ledgerId, schemas, data]);

    const handleLedgerChange = useCallback((ledgerId: string) => {
        const schema = schemas.find(s => s._id === ledgerId);
        if (schema) {
            data.ledgerId = ledgerId;
            data.ledgerName = schema.name;
            data.ports = schema.fields.map(field => ({
                id: `port-${field.name}`,
                type: field.type,
                fieldName: field.name,
            }));
            // Force re-render
            setIsConfigOpen(false);
        }
    }, [schemas, data]);

    const selectedSchema = schemas.find(s => s._id === nodeData.ledgerId);

    return (
        <div
            className={`bg-zinc-900 border-2 rounded-lg shadow-lg min-w-[200px] max-w-[280px] ${
                selected ? 'border-emerald-500' : 'border-zinc-700'
            }`}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded-t-md cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Database size={14} className="text-emerald-400" />
                    <span className="text-sm font-semibold text-zinc-100">
                        {nodeData.ledgerName || 'Select Ledger...'}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsConfigOpen(!isConfigOpen);
                        }}
                        className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200"
                        title="Configure"
                    >
                        ⚙️
                    </button>
                    {isExpanded ? <ChevronUp size={14} className="text-zinc-400" /> : <ChevronDown size={14} className="text-zinc-400" />}
                </div>
            </div>

            {/* Configuration Panel */}
            {isConfigOpen && (
                <div className="p-3 border-b border-zinc-700 bg-zinc-800/50">
                    <label className="text-xs text-zinc-400 block mb-1">Select Ledger:</label>
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
            )}

            {/* Ports */}
            {isExpanded && nodeData.ports && nodeData.ports.length > 0 && (
                <div className="p-2 space-y-1">
                    {nodeData.ports.map((port) => (
                        <div
                            key={port.id}
                            className="relative flex items-center justify-between px-2 py-1.5 bg-zinc-800/30 rounded hover:bg-zinc-800/50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <PortTypeIcon type={port.type} />
                                <span className="text-xs text-zinc-300">{port.fieldName}</span>
                            </div>
                            {/* Output Handle */}
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={port.id}
                                className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-zinc-900 hover:!bg-emerald-400 transition-colors"
                                style={{ right: '-6px' }}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {isExpanded && (!nodeData.ports || nodeData.ports.length === 0) && (
                <div className="p-4 text-center">
                    <p className="text-xs text-zinc-500">
                        {nodeData.ledgerId ? 'No fields in this ledger' : 'Select a ledger to see ports'}
                    </p>
                </div>
            )}
        </div>
    );
});

const PortTypeIcon: React.FC<{ type: string }> = ({ type }) => {
    const colors: Record<string, string> = {
        text: 'bg-blue-500',
        number: 'bg-amber-500',
        date: 'bg-purple-500',
        relation: 'bg-emerald-500',
    };

    return (
        <div
            className={`w-2 h-2 rounded-full ${colors[type] || 'bg-zinc-500'}`}
            title={type}
        />
    );
};
