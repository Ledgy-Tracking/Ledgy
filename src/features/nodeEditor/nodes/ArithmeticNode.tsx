import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Calculator, AlertCircle } from 'lucide-react';
import { ArithmeticOperation, ARITHMETIC_OPERATIONS } from '../../../types/nodeEditor';
import { useNodeStore } from '../../../stores/useNodeStore';

export interface ArithmeticNodeData {
    label: string;
    operation: ArithmeticOperation;
    result: number | null;
    error?: string;
    isComputing?: boolean;
    changePercent?: number;
    trend?: 'up' | 'down' | 'neutral';
}

/**
 * Arithmetic Node - Performs sum, average, min, max on numeric input
 * Refactored to be passive (Story 4-3 cleanup)
 */
export const ArithmeticNode: React.FC<NodeProps> = React.memo(({ id, data, selected }) => {
    const nodeData = data as unknown as ArithmeticNodeData;

    const handleOperationChange = (newOperation: ArithmeticOperation) => {
        useNodeStore.getState().updateNodeData(id, { operation: newOperation });
    };

    const formatResult = (value: number | null | undefined) => {
        if (typeof value !== 'number') return '-';
        if (nodeData.operation === 'average') return value.toFixed(2);
        return value.toLocaleString();
    };

    return (
        <div
            className={`bg-zinc-900 border-2 rounded-lg shadow-lg min-w-[200px] ${selected ? 'border-emerald-500' : 'border-zinc-700'
                } ${nodeData.error ? 'border-red-500/50' : ''}`}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-t-md">
                <Calculator size={14} className="text-amber-400" />
                <span className="text-sm font-semibold text-zinc-100">Arithmetic</span>
            </div>

            {/* Operation Selector */}
            <div className="px-3 py-2 border-b border-zinc-700">
                <select
                    value={nodeData.operation || 'sum'}
                    onChange={(e) => handleOperationChange(e.target.value as ArithmeticOperation)}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    {ARITHMETIC_OPERATIONS.map(op => (
                        <option key={op} value={op}>
                            {op.charAt(0).toUpperCase() + op.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Input Port */}
            <div className="p-3">
                <div className="relative">
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="target-number-values"
                        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-zinc-900 hover:!bg-emerald-400"
                        style={{ left: '-6px' }}
                    />
                    <span className="text-xs text-zinc-400">values (numeric[])</span>
                </div>
            </div>

            {/* Result Display */}
            <div className="px-3 pb-3">
                <div className="bg-zinc-800/50 rounded p-2 border border-zinc-700">
                    <div className="text-xs text-zinc-500 mb-1">
                        {(nodeData.operation || 'sum').charAt(0).toUpperCase() + (nodeData.operation || 'sum').slice(1)}
                    </div>
                    {nodeData.error ? (
                        <div className="flex items-center gap-1.5 text-red-400 text-xs">
                            <AlertCircle size={12} />
                            <span>{nodeData.error}</span>
                        </div>
                    ) : nodeData.isComputing ? (
                        <div className="text-amber-400 text-xs animate-pulse">Computing...</div>
                    ) : (
                        <div className={`text-lg font-bold ${nodeData.result !== null ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {formatResult(nodeData.result)}
                        </div>
                    )}
                </div>
            </div>

            {/* Output Port */}
            <div className="px-3 pb-3">
                <div className="relative flex justify-end">
                    <span className="text-xs text-zinc-400 mr-2">result</span>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="source-number-result"
                        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-zinc-900 hover:!bg-emerald-400"
                        style={{ right: '-6px' }}
                    />
                </div>
            </div>
        </div>
    );
});
