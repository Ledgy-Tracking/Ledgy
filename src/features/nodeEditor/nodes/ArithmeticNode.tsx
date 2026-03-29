import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Calculator, AlertCircle } from 'lucide-react';
import { ArithmeticOperation, ARITHMETIC_OPERATIONS } from '../../../types/nodeEditor';
import { useNodeStore } from '../../../stores/useNodeStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
            className={`bg-gray-50 dark:bg-zinc-900 border-2 rounded-lg shadow-lg min-w-[200px] ${selected ? 'border-emerald-500' : 'border-zinc-300 dark:border-zinc-700'
                } ${nodeData.error ? 'border-red-500/50' : ''}`}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-zinc-800 rounded-t-md">
                <Calculator size={14} className="text-amber-400" />
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Arithmetic</span>
            </div>

            {/* Operation Selector */}
            <div className="px-3 py-2 border-b border-zinc-300 dark:border-zinc-700">
                <Select
                    value={nodeData.operation || 'sum'}
                    onValueChange={(value) => handleOperationChange(value as ArithmeticOperation)}
                >
                    <SelectTrigger className="w-full bg-gray-100 dark:bg-zinc-800 border-zinc-600 h-8 text-xs">
                        <SelectValue placeholder="Operation" />
                    </SelectTrigger>
                    <SelectContent>
                        {ARITHMETIC_OPERATIONS.map(op => (
                            <SelectItem key={op} value={op}>
                                {op.charAt(0).toUpperCase() + op.slice(1)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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
                <Card className="bg-gray-100 dark:bg-zinc-800/50 rounded p-2 border border-zinc-300 dark:border-zinc-700">
                    <CardContent className="p-0">
                        <div className="text-xs text-zinc-500 mb-1">
                            {(nodeData.operation || 'sum').charAt(0).toUpperCase() + (nodeData.operation || 'sum').slice(1)}
                        </div>
                        {nodeData.error ? (
                            <div className="flex items-center gap-1.5 text-red-400 text-xs">
                                <AlertCircle size={12} />
                                <span>{nodeData.error}</span>
                            </div>
                        ) : nodeData.isComputing ? (
                            <Skeleton className="text-amber-400 text-xs">Computing...</Skeleton>
                        ) : (
                            <div className={`text-lg font-bold ${nodeData.result !== null ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                {formatResult(nodeData.result)}
                            </div>
                        )}
                    </CardContent>
                </Card>
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

