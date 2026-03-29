import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveGridLayout } from 'react-grid-layout';
import { useContainerWidth } from '../../hooks/useContainerWidth';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useProfileStore } from '../../stores/useProfileStore';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { useNodeStore } from '../../stores/useNodeStore';
import { TextWidget, TrendWidget, ChartWidget, WidgetConfig } from './widgets';
import { Plus, Trash2, BarChart3, TrendingUp, Type, Settings } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WidgetConfigSheet } from './WidgetConfigSheet';

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
    const { widgets, fetchWidgets, saveWidgets, addWidget, removeWidget, updateWidget } = useDashboardStore();
    const [isAddingWidget, setIsAddingWidget] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [selectedWidget, setSelectedWidget] = useState<WidgetConfig | null>(null);
    const { width, containerRef, mounted } = useContainerWidth();

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

    const onLayoutChange = (layout: any) => {
        // Optimize lookup by indexing widgets to reduce complexity from O(N^2) to O(N)
        const widgetMap = new Map(widgets.map(w => [w.id, w]));
        layout.forEach((l: any) => {
            const widget = widgetMap.get(l.i);
            if (widget && (
                widget.position.x !== l.x ||
                widget.position.y !== l.y ||
                widget.position.w !== l.w ||
                widget.position.h !== l.h
            )) {
                updateWidget(widget.id, {
                    position: { x: l.x, y: l.y, w: l.w, h: l.h }
                });
            }
        });
    };

    const generateLayout = () => {
        return widgets.map(w => ({
            i: w.id,
            x: w.position.x || 0,
            y: w.position.y || 0,
            w: w.position.w || 2,
            h: w.position.h || 1,
            minW: 1,
            minH: 1
        }));
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
                <h1 className="text-lg font-semibold">Dashboard</h1>
                <div className="relative">
                    <Button
                        onClick={() => setIsAddingWidget(!isAddingWidget)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-zinc-900 dark:text-white"
                        size="sm"
                        aria-haspopup="true"
                        aria-expanded={isAddingWidget}
                    >
                        <Plus size={16} className="mr-2" />
                        Add Widget
                    </Button>

                    {/* Widget Type Selector Dropdown */}
                    {isAddingWidget && (
                        <Card className="absolute right-0 mt-1 w-48 bg-gray-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-xl z-50">
                            <CardContent className="p-2">
                                <Button
                                    onClick={() => handleAddWidget('chart')}
                                    variant="ghost"
                                    className="w-full justify-start text-sm text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-800"
                                >
                                    <BarChart3 size={16} className="text-blue-400" />
                                    Chart Widget
                                </Button>
                                <Button
                                    onClick={() => handleAddWidget('trend')}
                                    variant="ghost"
                                    className="w-full justify-start text-sm text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-800"
                                >
                                    <TrendingUp size={16} className="text-emerald-400" />
                                    Trend Widget
                                </Button>
                                <Button
                                    onClick={() => handleAddWidget('text')}
                                    variant="ghost"
                                    className="w-full justify-start text-sm text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-800"
                                >
                                    <Type size={16} className="text-purple-400" />
                                    Text Widget
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Widget Grid */}
            <ScrollArea ref={containerRef} className="flex-1 overflow-auto p-4">
                {!isLoaded ? (
                    <div className="h-full flex items-center justify-center text-zinc-500">
                        Loading dashboard...
                    </div>
                ) : widgets.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                        <p className="text-lg font-medium mb-2">No widgets yet</p>
                        <p className="text-sm">Click "Add Widget" to create your first dashboard widget</p>
                    </div>
                ) : mounted && (
                    <ResponsiveGridLayout
                        className="layout"
                        width={width}
                        layouts={{ lg: generateLayout() }}
                        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                        cols={{ lg: 4, md: 3, sm: 2, xs: 1, xxs: 1 }}
                        rowHeight={180}
                        onLayoutChange={onLayoutChange as any}
                        dragConfig={{ handle: '.widget-drag-handle' }}
                    >
                        {widgets.map((widget) => (
                            <div key={widget.id} className="relative group bg-gray-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                                {/* Widget Drag Handle & Actions */}
                                <div className="absolute top-0 left-0 right-0 h-8 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center px-2 bg-gradient-to-b from-black/50 to-transparent z-10">
                                    <div className="widget-drag-handle flex-1 h-full cursor-grab active:cursor-grabbing" />
                                    <div className="flex items-center gap-1">
                                        <Button
                                            onClick={() => setSelectedWidget(widget)}
                                            variant="ghost"
                                            size="icon-xs"
                                            className="text-zinc-400 hover:text-zinc-800 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-zinc-800"
                                            title="Widget settings"
                                            aria-label="Widget settings"
                                        >
                                            <Settings size={14} />
                                        </Button>
                                        <Button
                                            onClick={() => removeWidget(widget.id)}
                                            variant="ghost"
                                            size="icon-xs"
                                            className="text-zinc-400 hover:text-red-400 hover:bg-red-900/50"
                                            title="Remove widget"
                                            aria-label="Remove widget"
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>

                                {/* Widget Content */}
                                <div className="flex-1 overflow-hidden pointer-events-none">
                                    <WidgetContent widget={widget} />
                                </div>
                            </div>
                        ))}
                    </ResponsiveGridLayout>
                )}
            </ScrollArea>

            <WidgetConfigSheet
                widget={selectedWidget}
                open={selectedWidget !== null}
                onOpenChange={(open) => {
                    if (!open) setSelectedWidget(null);
                }}
            />
        </div>
    );
};

interface WidgetContentProps {
    widget: WidgetConfig;
}

const WidgetContent: React.FC<WidgetContentProps> = ({ widget }) => {
    // Select specific node to prevent unnecessary re-renders when unrelated nodes update
    const sourceNode = useNodeStore(
        state => state.nodes.find(n => n.id === widget.nodeId)
    );

    // Extract data from the source node (prefer live computation result)
    const nodeData = (sourceNode?.data || {}) as any;
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
