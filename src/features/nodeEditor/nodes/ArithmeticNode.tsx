import React, { useCallback, useMemo, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Calculator, AlertCircle, Plus, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { portColorMap } from '../utils/portColors';
import { calculateArithmetic, ArithmeticOperation } from '../utils/statistics';

export interface ArithmeticNodeData {
    label: string;
    operation: ArithmeticOperation;
    precision?: number;
    inputCount?: number;
    inputs?: number[];
    output?: number;
    lastResult?: {
        value: number | null;
        computedAt: string;
        error?: string;
    };
    isComputing?: boolean;
}

/**
 * Runtime type guard for ArithmeticNodeData
 */
function isValidArithmeticNodeData(data: unknown): data is ArithmeticNodeData {
    if (typeof data !== 'object' || data === null) return false;
    const d = data as Record<string, unknown>;
    return (
        typeof d.label === 'string' &&
        typeof d.operation === 'string' &&
        (d.precision === undefined || typeof d.precision === 'number') &&
        (d.inputCount === undefined || typeof d.inputCount === 'number') &&
        (d.inputs === undefined || Array.isArray(d.inputs)) &&
        (d.isComputing === undefined || typeof d.isComputing === 'boolean')
    );
}

// Constants for input limits
const MIN_INPUTS = 2;
const MAX_INPUTS = 5;

const OPERATION_SYMBOLS: Record<ArithmeticOperation, string> = {
    add: '+',
    sum: 'Σ',
    subtract: '−',
    multiply: '×',
    divide: '÷',
    average: 'Avg',
    min: 'Min',
    max: 'Max',
};

/**
 * Arithmetic Node - Performs mathematical operations
 * Story 4-6: Arithmetic Node Component with dynamic ports and live preview
 * 
 * Features:
 * - Dynamic input ports (2-5 inputs)
 * - Multiple operations: Add, Subtract, Multiply, Divide, Sum, Average, Min, Max
 * - Live result preview
 */
export const ArithmeticNode: React.FC<NodeProps> = React.memo(({ id, data, selected }) => {
    // Runtime type validation with fallback
    const nodeData = isValidArithmeticNodeData(data) ? data : {
        label: 'Invalid Node Data',
        operation: 'add' as ArithmeticOperation,
        precision: 2,
        inputCount: MIN_INPUTS,
        inputs: [],
        isComputing: false,
    };
    const { updateNodeData, getEdges, setEdges } = useReactFlow();
    
    const operation = nodeData.operation || 'add';
    const precision = nodeData.precision ?? 2;
    // Validate inputCount is actually a number before using Math functions
    const rawInputCount = typeof nodeData.inputCount === 'number' && !isNaN(nodeData.inputCount)
        ? nodeData.inputCount
        : MIN_INPUTS;
    const inputCount = Math.max(MIN_INPUTS, Math.min(MAX_INPUTS, rawInputCount));
    const inputs = nodeData.inputs || [];

    // Compute result
    const computedResult = useMemo(() => {
        const validInputs = inputs.filter((v): v is number => typeof v === 'number');
        if (validInputs.length === 0) return null;
        return calculateArithmetic(validInputs, operation);
    }, [inputs, operation]);

    // Auto-compute and update output when inputs change (Story 4.10 AC #3)
    useEffect(() => {
        if (computedResult && computedResult.value !== null && !computedResult.error) {
            // Update node data with computed output
            updateNodeData(id, {
                output: computedResult.value,
                lastResult: {
                    value: computedResult.value,
                    computedAt: new Date().toISOString(),
                    error: undefined
                },
                isComputing: false
            });
        } else if (computedResult?.error) {
            // Handle computation errors
            updateNodeData(id, {
                output: undefined,
                lastResult: {
                    value: null,
                    computedAt: new Date().toISOString(),
                    error: computedResult.error
                },
                isComputing: false
            });
        }
    }, [computedResult, id, updateNodeData]);

    // Determine display value - prioritize nodeData.output for edge data flow consistency
    const displayValue = useMemo(() => {
        if (nodeData.lastResult?.error) return null;
        if (nodeData.isComputing) return null;
        if (nodeData.output != null) return nodeData.output;
        if (computedResult?.value != null) return computedResult.value;
        if (nodeData.lastResult?.value != null) return nodeData.lastResult.value;
        return null;
    }, [nodeData.lastResult, nodeData.isComputing, nodeData.output, computedResult]);

    const errorMessage = nodeData.lastResult?.error || computedResult?.error;

    // Handle input count changes
    const addInput = useCallback(() => {
        if (inputCount < 5) {
            updateNodeData(id, { inputCount: inputCount + 1 });
        }
    }, [id, inputCount, updateNodeData]);

    const removeInput = useCallback(() => {
        if (inputCount > MIN_INPUTS) {
            const targetInputId = `input-${inputCount - 1}`;
            const targetHandleId = `${id}:${targetInputId}`;
            
            // Check for and remove any edges connected to the input being removed
            const edges = getEdges();
            const edgesToRemove = edges.filter(
                edge => edge.target === id && edge.targetHandle === targetHandleId
            );
            
            if (edgesToRemove.length > 0) {
                const remainingEdges = edges.filter(
                    edge => !(edge.target === id && edge.targetHandle === targetHandleId)
                );
                setEdges(remainingEdges);
            }
            
            updateNodeData(id, { inputCount: inputCount - 1 });
        }
    }, [id, inputCount, updateNodeData, getEdges, setEdges]);

    // Format result
    const formatResult = (value: number | null): string => {
        if (value === null) return '—';
        if (operation === 'average') return value.toFixed(precision);
        if (Number.isInteger(value)) return value.toLocaleString();
        return value.toFixed(precision);
    };

    return (
        <div
            className={`w-[180px] rounded-lg border-2 shadow-lg overflow-hidden ${
                selected ? 'border-emerald-500' : 'border-zinc-300 dark:border-zinc-700'
            } ${
                errorMessage ? 'border-red-500/50' : ''
            } ${
                displayValue !== null ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-gray-100 dark:bg-zinc-800'
            } transition-colors duration-150`}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-zinc-800 border-b border-zinc-300 dark:border-zinc-700">
                <Calculator size={14} className="text-amber-500" />
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{nodeData.label || 'Arithmetic'}</span>
                {errorMessage && (
                    <AlertCircle size={14} className="text-red-400 ml-auto" />
                )}
            </div>

            {/* Operation Display */}
            <div className="px-3 py-1 border-b border-zinc-300/50 dark:border-zinc-700/50">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Operation</span>
                    <span className="text-xs font-medium text-amber-400">
                        {OPERATION_SYMBOLS[operation]} {operation}
                    </span>
                </div>
            </div>

            {/* Input Ports - Dynamic (2-5) */}
            <div className="px-3 py-2 space-y-2">
                {Array.from({ length: inputCount }, (_, i) => (
                    <div key={i} className="relative flex items-center">
                        <Handle
                            type="target"
                            position={Position.Left}
                            id={`input-${i}`}
                            className="!w-3 !h-3 !border-2 !border-zinc-900 transition-colors hover:!bg-emerald-400"
                            style={{ 
                                left: '-6px',
                                backgroundColor: portColorMap.number
                            }}
                            aria-label={`Input ${i + 1}, accepts number`}
                        />
                        <span className="text-xs text-zinc-400 ml-4">Input {i + 1}</span>
                        <span className="text-[10px] text-emerald-400 ml-auto">number</span>
                    </div>
                ))}
                
                {/* Add/Remove Input Buttons */}
                <div className="flex items-center justify-center gap-1 pt-1">
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={removeInput}
                        disabled={inputCount <= 2}
                        className="h-5 w-5 text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                        aria-label="Remove input port"
                    >
                        <Minus size={12} />
                    </Button>
                    <span className="text-[10px] text-zinc-500 px-1">{inputCount} inputs</span>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={addInput}
                        disabled={inputCount >= 5}
                        className="h-5 w-5 text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                        aria-label="Add input port"
                    >
                        <Plus size={12} />
                    </Button>
                </div>
            </div>

            {/* Live Result Preview */}
            <div className="px-3 pb-2">
                <Card className="bg-gray-100/50 dark:bg-zinc-800/50 rounded p-2 border border-zinc-300 dark:border-zinc-700">
                    <div className="text-[10px] text-zinc-500 mb-1">Result</div>
                    
                    {errorMessage ? (
                        <div className="flex items-center gap-1.5 text-red-400 text-xs">
                            <AlertCircle size={12} />
                            <span className="truncate">{errorMessage}</span>
                        </div>
                    ) : nodeData.isComputing ? (
                        <Skeleton className="h-6 w-20 bg-zinc-700" />
                    ) : (
                        <div className={`text-xl font-bold ${
                            displayValue !== null ? 'text-emerald-400' : 'text-zinc-500'
                        }`}>
                            = {formatResult(displayValue)}
                        </div>
                    )}
                </Card>
            </div>

            {/* Output Port */}
            <div className="px-3 pb-3">
                <div className="relative flex items-center justify-end">
                    <span className="text-xs text-zinc-400 mr-2">result</span>
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
                        aria-label="Output result, number type"
                    />
                </div>
            </div>
        </div>
    );
});

ArithmeticNode.displayName = 'ArithmeticNode';
