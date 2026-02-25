import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { computationService } from '../../../services/computationService';
import { Calculator, AlertCircle } from 'lucide-react';

export interface ArithmeticNodeData {
    label: string;
    operation: 'sum' | 'average' | 'min' | 'max';
    result: number | null;
    error?: string;
    isComputing: boolean;
    inputData?: {
        values?: number[];
    };
}

/**
 * Arithmetic Node - Performs sum, average, min, max on numeric input
 * Story 4-3: Correlation & Compute Nodes
 */
export const ArithmeticNode: React.FC<NodeProps> = React.memo(({ id, data, selected }) => {
    const nodeData = data as ArithmeticNodeData;
    const [result, setResult] = useState<number | null>(nodeData.result || null);
    const [error, setError] = useState<string | undefined>(nodeData.error);
    const [isComputing, setIsComputing] = useState(false);
    const [operation, setOperation] = useState<'sum' | 'average' | 'min' | 'max'>(
        nodeData.operation || 'average'
    );
    const inputDataRef = useRef<{ values?: number[] }>({});
    const computeTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Trigger computation when input data changes (debounced)
    const triggerComputation = useCallback((values?: number[]) => {
        if (computeTimerRef.current) {
            clearTimeout(computeTimerRef.current);
        }

        computeTimerRef.current = setTimeout(() => {
            if (!values || values.length === 0) {
                setResult(null);
                setError('Waiting for input data...');
                setIsComputing(false);
                return;
            }

            setIsComputing(true);
            setError(undefined);

            computationService.computeArithmetic(values, operation, (response) => {
                setResult(response.result);
                setError(response.error);
                setIsComputing(false);

                // Update node data
                data.result = response.result;
                data.error = response.error;
                data.isComputing = false;
            });
        }, 300); // 300ms debounce
    }, [data, operation]);

    // Listen for data changes
    useEffect(() => {
        const values = nodeData.inputData?.values;

        if (values !== inputDataRef.current.values) {
            inputDataRef.current = { values };
            triggerComputation(values);
        }

        return () => {
            if (computeTimerRef.current) {
                clearTimeout(computeTimerRef.current);
            }
        };
    }, [nodeData.inputData, triggerComputation]);

    const handleOperationChange = (newOperation: 'sum' | 'average' | 'min' | 'max') => {
        setOperation(newOperation);
        data.operation = newOperation;
        // Recompute with new operation
        triggerComputation(inputDataRef.current.values);
    };

    const formatResult = (value: number | null) => {
        if (value === null) return '-';
        if (operation === 'average') return value.toFixed(2);
        return value.toLocaleString();
    };

    return (
        <div
            className={`bg-zinc-900 border-2 rounded-lg shadow-lg min-w-[200px] ${
                selected ? 'border-emerald-500' : 'border-zinc-700'
            } ${error ? 'border-red-500/50' : ''}`}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-t-md">
                <Calculator size={14} className="text-amber-400" />
                <span className="text-sm font-semibold text-zinc-100">Arithmetic</span>
            </div>

            {/* Operation Selector */}
            <div className="px-3 py-2 border-b border-zinc-700">
                <select
                    value={operation}
                    onChange={(e) => handleOperationChange(e.target.value as any)}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="sum">Sum</option>
                    <option value="average">Average</option>
                    <option value="min">Min</option>
                    <option value="max">Max</option>
                </select>
            </div>

            {/* Input Port */}
            <div className="p-3">
                <div className="relative">
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="input-values"
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
                        {operation.charAt(0).toUpperCase() + operation.slice(1)}
                    </div>
                    {error ? (
                        <div className="flex items-center gap-1.5 text-red-400 text-xs">
                            <AlertCircle size={12} />
                            <span>{error}</span>
                        </div>
                    ) : isComputing ? (
                        <div className="text-amber-400 text-xs animate-pulse">Computing...</div>
                    ) : (
                        <div className={`text-lg font-bold ${result !== null ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {formatResult(result)}
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
                        id="output-result"
                        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-zinc-900 hover:!bg-emerald-400"
                        style={{ right: '-6px' }}
                    />
                </div>
            </div>
        </div>
    );
});
