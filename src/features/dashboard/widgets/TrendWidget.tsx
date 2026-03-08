import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendWidgetProps {
    title: string;
    value: number;
    trend?: 'up' | 'down' | 'neutral';
    changePercent?: number;
    className?: string;
}

/**
 * Trend Widget - Displays a value with trend indicator (up/down arrow).
 * Story 4-5, AC 2: Widget Types - Trend Indicator.
 */
export const TrendWidget: React.FC<TrendWidgetProps> = ({
    title,
    value,
    trend = 'neutral',
    changePercent,
    className = '',
}) => {
    const getTrendIcon = () => {
        switch (trend) {
            case 'up':
                return <TrendingUp size={20} className="text-emerald-400" />;
            case 'down':
                return <TrendingDown size={20} className="text-red-400" />;
            default:
                return <Minus size={20} className="text-zinc-400" />;
        }
    };

    const getTrendColor = () => {
        switch (trend) {
            case 'up':
                return 'text-emerald-400';
            case 'down':
                return 'text-red-400';
            default:
                return 'text-zinc-400';
        }
    };

    return (
        <div className={`p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors ${className}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {getTrendIcon()}
                    <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
                </div>
                {changePercent !== undefined && (
                    <span className={`text-xs font-medium ${getTrendColor()}`}>
                        {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
                    </span>
                )}
            </div>
            <div className="text-2xl font-bold text-zinc-50">
                {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
        </div>
    );
};
