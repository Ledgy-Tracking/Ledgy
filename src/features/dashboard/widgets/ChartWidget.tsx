import React from 'react';
import { BarChart3, LineChart } from 'lucide-react';

interface ChartWidgetProps {
    title: string;
    chartType?: 'bar' | 'line';
    data?: Array<{ label: string; value: number }>;
    className?: string;
}

/**
 * Chart Widget - Displays bar or line chart visualization.
 * Story 4-5, AC 2: Widget Types - Chart (line/bar).
 */
export const ChartWidget: React.FC<ChartWidgetProps> = ({
    title,
    chartType = 'bar',
    data = [],
    className = '',
}) => {
    const maxValue = data.length > 0 ? Math.max(...data.map(d => d.value)) : 1;

    return (
        <div className={`p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors ${className}`}>
            <div className="flex items-center gap-2 mb-3">
                {chartType === 'bar' ? (
                    <BarChart3 size={16} className="text-blue-400" />
                ) : (
                    <LineChart size={16} className="text-blue-400" />
                )}
                <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
            </div>

            {data.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-zinc-500 text-sm">
                    No data available
                </div>
            ) : (
                <div className="h-32 flex items-end gap-1">
                    {chartType === 'bar' ? (
                        // Bar Chart
                        data.map((item, index) => {
                            const heightPercent = (item.value / maxValue) * 100;
                            return (
                                <div
                                    key={index}
                                    className="flex-1 flex flex-col items-center gap-1"
                                >
                                    <div
                                        className="w-full bg-emerald-500 hover:bg-emerald-400 transition-colors rounded-t"
                                        style={{ height: `${heightPercent}%` }}
                                        title={`${item.label}: ${item.value}`}
                                    />
                                    <span className="text-[10px] text-zinc-500 truncate w-full text-center">
                                        {item.label}
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        // Line Chart (simplified SVG)
                        <svg
                            viewBox="0 0 100 50"
                            className="w-full h-full"
                            preserveAspectRatio="none"
                        >
                            <polyline
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="2"
                                points={data.map((d, i) => 
                                    `${(i / (data.length - 1)) * 100},${50 - (d.value / maxValue) * 50}`
                                ).join(' ')}
                            />
                            {data.map((d, i) => (
                                <circle
                                    key={i}
                                    cx={(i / (data.length - 1)) * 100}
                                    cy={50 - (d.value / maxValue) * 50}
                                    r="2"
                                    fill="#10b981"
                                />
                            ))}
                        </svg>
                    )}
                </div>
            )}
        </div>
    );
};
