import React, { useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { portColorMap } from '../utils/portColors';
import { calculatePearsonCorrelation, getCorrelationColor, getCorrelationLabel } from '../utils/statistics';

export interface CorrelationNodeData {
    label: string;
    correlationType: 'pearson';
    inputA?: number[];
    inputB?: number[];
    lastResult?: {
        correlation: number | null;
        sampleSize: number;
        computedAt: string;
        error?: string;
    };
    isComputing?: boolean;
}

/**
 * Runtime type guard for CorrelationNodeData
 */
function isValidCorrelationNodeData(data: unknown): data is CorrelationNodeData {
    if (typeof data !== 'object' || data === null) return false;
    const d = data as Record<string, unknown>;
    return (
        typeof d.label === 'string' &&
        (d.correlationType === undefined || d.correlationType === 'pearson') &&
        (d.inputA === undefined || Array.isArray(d.inputA)) &&
        (d.inputB === undefined || Array.isArray(d.inputB)) &&
        (d.isComputing === undefined || typeof d.isComputing === 'boolean')
    );
}

/**
 * Correlation Node - Computes Pearson correlation between two numeric arrays
 * Story 4-6: Correlation Node Component with live preview
 * 
 * Port Types:
 * - Input A/B: number[] (cyan for array type)
 * - Output: number (emerald for scalar)
 */
export const CorrelationNode: React.FC<NodeProps> = React.memo(({ data, selected }) => {
    // Runtime type validation with fallback
    const nodeData = isValidCorrelationNodeData(data) ? data : {
        label: 'Invalid Node Data',
        correlationType: 'pearson' as const,
        inputA: undefined,
        inputB: undefined,
        isComputing: false,
    };

    // Compute correlation from inputs
    const computedResult = useMemo(() => {
        if (!nodeData.inputA || !nodeData.inputB) {
            return null;
        }
        return calculatePearsonCorrelation(nodeData.inputA, nodeData.inputB);
    }, [nodeData.inputA, nodeData.inputB]);

    // Determine display value
    const displayValue = useMemo(() => {
        if (nodeData.lastResult?.error) return null;
        if (nodeData.isComputing) return null;
        if (computedResult?.r != null) return computedResult.r;
        if (nodeData.lastResult?.correlation != null) return nodeData.lastResult.correlation;
        return null;
    }, [nodeData.lastResult, nodeData.isComputing, computedResult]);

    const errorMessage = nodeData.lastResult?.error || computedResult?.error;
    const sampleSize = computedResult?.sampleSize || nodeData.lastResult?.sampleSize || 0;

    return (
        <div
            className={`w-[180px] rounded-lg border-2 shadow-lg overflow-hidden ${
                selected ? 'border-emerald-500' : 'border-zinc-300 dark:border-zinc-700'
            } ${
                errorMessage ? 'border-red-500/50' : ''
            } ${
                displayValue !== null ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-gray-100 dark:bg-zinc-800'
            } transition-colors duration-150`}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-zinc-800 border-b border-zinc-300 dark:border-zinc-700">
                <GitBranch size={14} className="text-emerald-500 rotate-90" />
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{nodeData.label || 'Correlation'}</span>
                {errorMessage && (
                    <AlertCircle size={14} className="text-red-400 ml-auto" />
                )}
            </div>

            {/* Input Ports - Cyan for number[] array type */}
            <div className="px-3 py-2 space-y-3">
                <div className="relative flex items-center">
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="inputA"
                        className="!w-3 !h-3 !border-2 !border-zinc-900 transition-colors hover:!bg-cyan-400"
                        style={{ 
                            left: '-6px',
                            backgroundColor: portColorMap['number[]']
                        }}
                        aria-label="Input A, accepts number array"
                    />
                    <span className="text-xs text-zinc-400 ml-4">Input A</span>
                    <span className="text-[10px] text-cyan-400 ml-auto">number[]</span>
                </div>
                <div className="relative flex items-center">
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="inputB"
                        className="!w-3 !h-3 !border-2 !border-zinc-900 transition-colors hover:!bg-cyan-400"
                        style={{ 
                            left: '-6px',
                            backgroundColor: portColorMap['number[]']
                        }}
                        aria-label="Input B, accepts number array"
                    />
                    <span className="text-xs text-zinc-400 ml-4">Input B</span>
                    <span className="text-[10px] text-cyan-400 ml-auto">number[]</span>
                </div>
            </div>

            {/* Live Preview */}
            <div className="px-3 pb-2">
                <Card className="bg-gray-100/50 dark:bg-zinc-800/50 rounded p-2 border border-zinc-300 dark:border-zinc-700">
                    <div className="text-[10px] text-zinc-500 mb-1 flex justify-between">
                        <span>Pearson r</span>
                        {sampleSize > 0 && <span>N = {sampleSize}</span>}
                    </div>
                    
                    {errorMessage ? (
                        <div className="flex items-center gap-1.5 text-red-400 text-xs">
                            <AlertCircle size={12} />
                            <span className="truncate">{errorMessage}</span>
                        </div>
                    ) : nodeData.isComputing ? (
                        <Skeleton className="h-5 w-16 bg-zinc-700" />
                    ) : displayValue !== null ? (
                        <div className="flex items-baseline gap-2">
                            <span className={`text-lg font-bold ${getCorrelationColor(displayValue)}`}>
                                {displayValue.toFixed(3)}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                                {getCorrelationLabel(displayValue)}
                            </span>
                        </div>
                    ) : (
                        <span className="text-zinc-500 text-sm">—</span>
                    )}
                </Card>
            </div>

            {/* Output Port - Emerald for number scalar */}
            <div className="px-3 pb-3">
                <div className="relative flex items-center justify-end">
                    <span className="text-xs text-zinc-400 mr-2">r-value</span>
                    <span className="text-[10px] text-emerald-400 mr-2">number</span>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="output"
                        className="!w-3 !h-3 !border-2 !border-zinc-900 transition-colors hover:!bg-emerald-400"
                        style={{ 
                            right: '-6px',
                            backgroundColor: portColorMap.number
                        }}
                        aria-label="Output r-value, number type"
                    />
                </div>
            </div>
        </div>
    );
});

CorrelationNode.displayName = 'CorrelationNode';
