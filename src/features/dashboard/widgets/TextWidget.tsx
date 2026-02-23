import React from 'react';
import { Type } from 'lucide-react';

interface TextWidgetProps {
    title: string;
    value: string | number;
    subtitle?: string;
    className?: string;
}

/**
 * Text Widget - Displays a large text value for dashboard metrics.
 * Story 4-5, AC 2: Widget Types - Text Value (large number).
 */
export const TextWidget: React.FC<TextWidgetProps> = ({
    title,
    value,
    subtitle,
    className = '',
}) => {
    return (
        <div className={`p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors ${className}`}>
            <div className="flex items-center gap-2 mb-2">
                <Type size={16} className="text-purple-400" />
                <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
            </div>
            <div className="text-3xl font-bold text-zinc-50 mb-1">
                {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            {subtitle && (
                <p className="text-xs text-zinc-500">{subtitle}</p>
            )}
        </div>
    );
};
