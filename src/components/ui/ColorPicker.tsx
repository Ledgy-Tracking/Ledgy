import React from 'react';
import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

export interface ColorPickerProps {
    value?: string;
    onChange: (color: string) => void;
    presetColors?: string[];
    className?: string;
}

// Preset colors aligned with Tailwind classes
export const DEFAULT_PRESET_COLORS = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-violet-500',
    'bg-pink-500',
    'bg-amber-500',
    'bg-red-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-zinc-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-fuchsia-500',
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
    value,
    onChange,
    presetColors = DEFAULT_PRESET_COLORS,
    className,
}) => {
    return (
        <div className={cn("flex flex-wrap gap-2 sm:gap-3", className)} role="radiogroup" aria-label="Profile Color Selection">
            {presetColors.map((colorClass) => {
                const isSelected = value === colorClass;
                return (
                    <button
                        key={colorClass}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`Select color ${colorClass.replace('bg-', '').replace('-500', '')}`}
                        className={cn(
                            "relative h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shadow-sm transition-all duration-200 ring-offset-2 ring-offset-zinc-950 focus:outline-none focus:ring-2",
                            colorClass,
                            isSelected ? "ring-2 ring-white scale-110" : "hover:scale-105 ring-transparent hover:ring-zinc-400"
                        )}
                        onClick={() => onChange(colorClass)}
                    >
                        {isSelected && (
                            <Check className="h-4 w-4 sm:h-5 sm:w-5 text-white drop-shadow-md animate-in zoom-in duration-200" />
                        )}
                    </button>
                );
            })}
        </div>
    );
};
