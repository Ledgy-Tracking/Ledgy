import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { computationService } from '../../services/computationService';
import { Calculator, AlertCircle } from 'lucide-react';

export interface CorrelationNodeData {
    label: string;
    result: number | null;
    error?: string;
    isComputing: boolean;
    inputData?: {
        x?: number[];
        y?: number[];
    };
}

/**
 * Correlation Node - Computes Pearson correlation between two numeric streams
 * Story 4-3: Correlation & Compute Nodes
 */
export const CorrelationNode: React.FC<NodeProps> = ({ id, data, selected }) => {
    const nodeData = data as CorrelationNodeData;
    const [result, setResult] = useState<number | null>(nodeData.result || null);
    const [error, setError] = useState<string | undefined>(nodeData.error);
    const [isComputing, setIsComputing] = useState(false);
    const inputDataRef = useRef<{ x?: number[]; y?: number[] }>({});
    const computeTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Trigger computation when input data changes (debounced)
    const triggerComputation = useCallback((xData?: number[], yData?: number[]) => {
        if (computeTimerRef.current) {
            clearTimeout(computeTimerRef.current);
        }

        computeTimerRef.current = setTimeout(() => {
            if (!xData || !yData || xData.length === 0 || yData.length === 0) {
                setResult(null);
                setError('Waiting for input data...');
                setIsComputing(false);
                return;
            }

            setIsComputing(true);
            setError(undefined);

            computationService.computeCorrelation(xData, yData, (response) => {
                setResult(response.result);
                setError(response.error);
                setIsComputing(false);

                // Update node data
                data.result = response.result;
                data.error = response.error;
                data.isComputing = false;
            });
        }, 300); // 300ms debounce
    }, [data]);

    // Listen for data changes via custom event (simplified - in production would use proper data flow)
    useEffect(() => {
        // Simulate receiving data from connected nodes
        // In production, this would be wired through the node editor data flow
        const xData = nodeData.inputData?.x;
        const yData = nodeData.inputData?.y;

        if (xData !== inputDataRef.current.x || yData !== inputDataRef.current.y) {
            inputDataRef.current = { x: xData, y: yData };
            triggerComputation(xData, yData);
        }

        return () => {
            if (computeTimerRef.current) {
                clearTimeout(computeTimerRef.current);
            }
        };
    }, [nodeData.inputData, triggerComputation]);

    const getCorrelationColor = (value: number | null) => {
        if (value === null) return 'text-zinc-500';
        if (value >= 0.7) return 'text-emerald-400';
        if (value >= 0.3) return 'text-amber-400';
        if (value >= -0.3) return 'text-zinc-400';
        if (value >= -0.7) return 'text-amber-400';
        return 'text-red-400';
    };

    const getCorrelationLabel = (value: number | null) => {
        if (value === null) return '-';
        if (value >= 0.7) return 'Strong +';
        if (value >= 0.3) return 'Moderate +';
        if (value >= -0.3) return 'Weak';
        if (value >= -0.7) return 'Moderate -';
        return 'Strong -';
    };

    return (
        <div
            className={`bg-zinc-900 border-2 rounded-lg shadow-lg min-w-[220px] ${
                selected ? 'border-emerald-500' : 'border-zinc-700'
            } ${error ? 'border-red-500/50' : ''}`}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-t-md">
                <Calculator size={14} className="text-purple-400" />
                <span className="text-sm font-semibold text-zinc-100">Correlation</span>
            </div>

            {/* Input Ports */}
            <div className="p-3 space-y-2">
                <div className="relative">
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="input-x"
                        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-zinc-900 hover:!bg-blue-400"
                        style={{ left: '-6px' }}
                    />
                    <span className="text-xs text-zinc-400">X (numeric)</span>
                </div>
                <div className="relative">
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="input-y"
                        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-zinc-900 hover:!bg-amber-400"
                        style={{ left: '-6px', top: 'auto', bottom: '0' }}
                    />
                    <span className="text-xs text-zinc-400">Y (numeric)</span>
                </div>
            </div>

            {/* Result Display */}
            <div className="px-3 pb-3">
                <div className="bg-zinc-800/50 rounded p-2 border border-zinc-700">
                    <div className="text-xs text-zinc-500 mb-1">Pearson r</div>
                    {error ? (
                        <div className="flex items-center gap-1.5 text-red-400 text-xs">
                            <AlertCircle size={12} />
                            <span>{error}</span>
                        </div>
                    ) : isComputing ? (
                        <div className="text-amber-400 text-xs animate-pulse">Computing...</div>
                    ) : (
                        <div className="flex items-baseline gap-2">
                            <span className={`text-lg font-bold ${getCorrelationColor(result)}`}>
                                {result !== null ? result.toFixed(3) : '-'}
                            </span>
                            <span className="text-xs text-zinc-500">
                                {getCorrelationLabel(result)}
                            </span>
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
                        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-zinc-900 hover:!bg-purple-400"
                        style={{ right: '-6px' }}
                    />
                </div>
            </div>
        </div>
    );
};
