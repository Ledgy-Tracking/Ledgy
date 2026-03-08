import React, { useState, useMemo } from 'react';
import { EdgeProps, getBezierPath, useReactFlow } from '@xyflow/react';

/**
 * Custom edge with data preview tooltip
 * Story 4-2: AC 4 - Hover displays data preview
 */
export const DataEdge: React.FC<EdgeProps> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    source,
    ..._rest
}) => {
    const { sourceHandle } = _rest as any;
    const [showTooltip, setShowTooltip] = useState(false);
    const { getNode } = useReactFlow();

    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    // Extract dynamic data from source node
    const flowData = useMemo(() => {
        const sourceNode = getNode(source);
        if (!sourceNode) return { type: 'unknown', value: 'No source' };

        const type = sourceHandle?.split('-')[1] || 'unknown';
        let value: any = 'No data';

        // Check if source node has computation result
        if (sourceNode.data?.result !== undefined) {
            value = sourceNode.data.result;
        } else if (sourceNode.type === 'ledgerSource') {
            value = 'Live ledger stream';
        } else if (sourceNode.data?.sampleData) {
            value = sourceNode.data.sampleData;
        }

        return { type, value };
    }, [getNode, source, sourceHandle]);

    const sampleData = flowData.value;
    const dataType = flowData.type;

    return (
        <>
            <path
                id={id}
                style={{
                    ...style,
                    strokeWidth: 2,
                    stroke: '#10b981',
                    fill: 'none',
                }}
                className="hover:stroke-emerald-400 transition-colors cursor-pointer"
                d={edgePath}
                markerEnd={markerEnd}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            />
            {showTooltip && (
                <g>
                    <foreignObject
                        x={(sourceX + targetX) / 2 - 60}
                        y={(sourceY + targetY) / 2 - 30}
                        width="120"
                        height="60"
                        style={{ overflow: 'visible', pointerEvents: 'none' }}
                    >
                        <div className="bg-zinc-900/95 border border-emerald-500/50 rounded px-2 py-1.5 text-[10px] text-zinc-200 shadow-xl z-50 backdrop-blur-sm">
                            <div className="font-bold text-emerald-400 uppercase tracking-tighter mb-0.5 border-b border-emerald-500/20 pb-0.5">
                                {dataType} flow
                            </div>
                            <div className="text-zinc-100 font-mono truncate">
                                {typeof sampleData === 'number' ? sampleData.toFixed(4) : String(sampleData)}
                            </div>
                        </div>
                    </foreignObject>
                </g>
            )}
        </>
    );
};
