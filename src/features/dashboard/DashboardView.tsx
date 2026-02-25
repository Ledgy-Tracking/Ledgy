import React, { useEffect, useState } from 'react';
import { useProfileStore } from '../../stores/useProfileStore';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { useNodeStore } from '../../stores/useNodeStore';
import { TextWidget, TrendWidget, ChartWidget, WidgetConfig } from './widgets';
import { Plus, Trash2, BarChart3, TrendingUp, Type } from 'lucide-react';

interface DashboardViewProps {
    dashboardId?: string;
}

/**
 * Dashboard View with CSS grid layout and draggable widgets.
 * Story 4-5: Dashboard Widgets.
 * AC 2: Widget Types (Chart, Trend, Text)
 * AC 3: Live Updates
 * AC 4: Flexible Layout
 * AC 5: Layout Persistence
 */
export const DashboardView: React.FC<DashboardViewProps> = ({
    dashboardId = 'default',
}) => {
    const { activeProfileId } = useProfileStore();
    const { widgets, fetchWidgets, saveWidgets, addWidget, removeWidget } = useDashboardStore();
    const [isAddingWidget, setIsAddingWidget] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load widgets on mount
    useEffect(() => {
        if (activeProfileId && !isLoaded) {
            fetchWidgets(activeProfileId, dashboardId).then(() => setIsLoaded(true));
        }
    }, [activeProfileId, dashboardId, fetchWidgets, isLoaded]);

    // Auto-save widgets on change (debounced)
    useEffect(() => {
        if (!isLoaded || !activeProfileId) return;

        const timer = setTimeout(() => {
            if (widgets.length > 0) {
                saveWidgets(activeProfileId, widgets, dashboardId);
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [widgets, activeProfileId, dashboardId, saveWidgets, isLoaded]);

    const handleAddWidget = (type: 'chart' | 'trend' | 'text') => {
        const newWidget: WidgetConfig = {
            id: `widget-${Date.now()}`,
            type,
            title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Widget`,
            position: { x: 0, y: 0, w: 2, h: 1 },
            data: { value: 0 },
        };
        addWidget(newWidget);
        setIsAddingWidget(false);
    };

    // Calculate grid layout based on widget positions
    const getGridStyle = (widget: WidgetConfig): React.CSSProperties => {
        return {
            gridColumn: `span ${widget.position.w}`,
            gridRow: `span ${widget.position.h}`,
        };
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
                <h1 className="text-lg font-semibold">Dashboard</h1>
                <div className="relative">
                    <button
                        onClick={() => setIsAddingWidget(!isAddingWidget)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
                    >
                        <Plus size={16} />
                        Add Widget
                    </button>

                    {/* Widget Type Selector Dropdown */}
                    {isAddingWidget && (
                        <div className="absolute right-0 mt-1 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50">
                            <div className="p-2">
                                <button
                                    onClick={() => handleAddWidget('chart')}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                                >
                                    <BarChart3 size={16} className="text-blue-400" />
                                    Chart Widget
                                </button>
                                <button
                                    onClick={() => handleAddWidget('trend')}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                                >
                                    <TrendingUp size={16} className="text-emerald-400" />
                                    Trend Widget
                                </button>
                                <button
                                    onClick={() => handleAddWidget('text')}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                                >
                                    <Type size={16} className="text-purple-400" />
                                    Text Widget
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Widget Grid */}
            <div className="flex-1 overflow-auto p-4">
                {!isLoaded ? (
                    <div className="h-full flex items-center justify-center text-zinc-500">
                        Loading dashboard...
                    </div>
                ) : widgets.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                        <p className="text-lg font-medium mb-2">No widgets yet</p>
                        <p className="text-sm">Click "Add Widget" to create your first dashboard widget</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min">
                        {widgets.map((widget) => (
                            <div
                                key={widget.id}
                                style={getGridStyle(widget)}
                                className="relative group"
                            >
                                {/* Widget Content */}
                                <WidgetContent widget={widget} />

                                {/* Widget Actions (hover) */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <button
                                        onClick={() => removeWidget(widget.id)}
                                        className="p-1.5 bg-zinc-800 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 rounded transition-colors"
                                        title="Remove widget"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

interface WidgetContentProps {
    widget: WidgetConfig;
}

const WidgetContent: React.FC<WidgetContentProps> = ({ widget }) => {
    const { nodes } = useNodeStore();
    
    // Find the source node for this widget (Story 4-5, AC 1 & 3)
    const sourceNode = nodes.find(n => n.id === widget.nodeId);
    
    // Extract data from the source node (prefer live computation result)
    const nodeData = sourceNode?.data || {};
    const displayValue = nodeData.result !== undefined ? nodeData.result : (widget.data?.value || 0);
    const chartData = nodeData.chartData || widget.data?.chartData || [];
    const trend = nodeData.trend || widget.data?.trend || 'neutral';
    const changePercent = nodeData.changePercent || widget.data?.changePercent;

    switch (widget.type) {
        case 'chart':
            return (
                <ChartWidget
                    title={widget.title}
                    chartType="bar"
                    data={chartData}
                />
            );
        case 'trend':
            return (
                <TrendWidget
                    title={widget.title}
                    value={displayValue}
                    trend={trend}
                    changePercent={changePercent}
                />
            );
        case 'text':
            return (
                <TextWidget
                    title={widget.title}
                    value={displayValue}
                    subtitle={nodeData.error || widget.data?.subtitle}
                />
            );
        default:
            return <div>Unknown widget type</div>;
    }
};
