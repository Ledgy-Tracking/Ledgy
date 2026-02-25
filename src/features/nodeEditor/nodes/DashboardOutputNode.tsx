import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useProfileStore } from '../../../stores/useProfileStore';
import { BarChart3, TrendingUp, Type } from 'lucide-react';

export interface DashboardOutputNodeData {
    label: string;
    widgetType: 'chart' | 'trend' | 'text';
    title: string;
    widgetId?: string;
}

/**
 * Dashboard Output Node - Publishes computation results to dashboard widgets
 * Story 4-5: Dashboard Widgets
 */
export const DashboardOutputNode: React.FC<NodeProps> = React.memo(({ id, data, selected }) => {
    const { activeProfileId } = useProfileStore();
    const nodeData = data as DashboardOutputNodeData;

    const handleWidgetTypeChange = (type: 'chart' | 'trend' | 'text') => {
        data.widgetType = type;
        data.widgetId = `widget-${Date.now()}`;
    };

    const handleTitleChange = (title: string) => {
        data.title = title;
    };

    const getWidgetIcon = () => {
        switch (nodeData.widgetType) {
            case 'chart':
                return <BarChart3 size={14} className="text-blue-400" />;
            case 'trend':
                return <TrendingUp size={14} className="text-emerald-400" />;
            case 'text':
                return <Type size={14} className="text-purple-400" />;
        }
    };

    return (
        <div
            className={`bg-zinc-900 border-2 rounded-lg shadow-lg min-w-[200px] ${
                selected ? 'border-emerald-500' : 'border-zinc-700'
            }`}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-t-md">
                {getWidgetIcon()}
                <span className="text-sm font-semibold text-zinc-100">
                    {nodeData.title || 'Dashboard Widget'}
                </span>
            </div>

            {/* Configuration */}
            <div className="p-3 space-y-3 border-b border-zinc-700">
                {/* Widget Type */}
                <div>
                    <label className="text-xs text-zinc-400 block mb-1">Widget Type:</label>
                    <div className="flex gap-1">
                        <button
                            onClick={() => handleWidgetTypeChange('chart')}
                            className={`flex-1 p-1.5 rounded border transition-colors ${
                                nodeData.widgetType === 'chart'
                                    ? 'bg-blue-600 border-blue-500 text-white'
                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                            }`}
                            title="Chart"
                        >
                            <BarChart3 size={14} />
                        </button>
                        <button
                            onClick={() => handleWidgetTypeChange('trend')}
                            className={`flex-1 p-1.5 rounded border transition-colors ${
                                nodeData.widgetType === 'trend'
                                    ? 'bg-emerald-600 border-emerald-500 text-white'
                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                            }`}
                            title="Trend"
                        >
                            <TrendingUp size={14} />
                        </button>
                        <button
                            onClick={() => handleWidgetTypeChange('text')}
                            className={`flex-1 p-1.5 rounded border transition-colors ${
                                nodeData.widgetType === 'text'
                                    ? 'bg-purple-600 border-purple-500 text-white'
                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                            }`}
                            title="Text"
                        >
                            <Type size={14} />
                        </button>
                    </div>
                </div>

                {/* Title */}
                <div>
                    <label className="text-xs text-zinc-400 block mb-1">Widget Title:</label>
                    <input
                        type="text"
                        value={nodeData.title || ''}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Enter widget title..."
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            </div>

            {/* Input Port */}
            <div className="p-3">
                <div className="relative">
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="target-any-data"
                        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-zinc-900 hover:!bg-purple-400"
                        style={{ left: '-6px' }}
                    />
                    <span className="text-xs text-zinc-400">data input</span>
                </div>
            </div>

            {/* Widget ID Display */}
            {nodeData.widgetId && (
                <div className="px-3 pb-3">
                    <div className="text-[10px] text-zinc-600">
                        Widget ID: {nodeData.widgetId.slice(-8)}
                    </div>
                </div>
            )}
        </div>
    );
});
