import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProfileStore } from '../../stores/useProfileStore';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ResolvedRelationValue } from '../../types/ledger';

interface RelationTagChipProps {
    value: string | string[];
    targetLedgerId?: string;
    entryId?: string;
    onClick?: () => void;
    isGhost?: boolean;
    resolvedValues?: ResolvedRelationValue[];
}

/**
 * Displays a relation field value as a clickable tag chip.
 * Supports single or multiple relations.
 * Navigates to target ledger entry on click (Story 3-3, AC 5).
 */
export const RelationTagChip: React.FC<RelationTagChipProps> = ({
    value,
    targetLedgerId,
    onClick,
    isGhost = false,
    resolvedValues,
}) => {
    const navigate = useNavigate();
    const { profileId } = useParams<{ profileId: string }>();
    const { activeProfileId } = useProfileStore();
    const values = Array.isArray(value) ? value : [value];

    if (values.length === 0 || !values[0]) {
        return <span className="text-zinc-600 italic">-</span>;
    }

    const handleClick = (id: string, chipIsGhost: boolean) => {
        if (chipIsGhost) return;

        // Call custom onClick if provided
        if (onClick) {
            onClick();
        }

        // Navigate to target ledger (Story 3-3, AC 5)
        if (targetLedgerId) {
            const navProfileId = profileId || activeProfileId;
            if (!navProfileId) {
                console.warn('Cannot navigate: No profile ID found');
                return;
            }
            navigate(`/app/${navProfileId}/ledger/${targetLedgerId}`, {
                state: { highlightEntryId: id }
            });
        }
    };

    // When resolvedValues is provided, drive rendering from it (avoids index misalignment
    // with the raw values array, which may contain entries filtered out by normalizeIds).
    // When absent, synthesize chip objects from the raw values array using the outer isGhost.
    const chips = resolvedValues ?? values.map(val => ({ id: val, displayValue: val, isGhost }));

    return (
        <div className="flex flex-wrap gap-1">
            {chips.map((chip, index) => (
                <Badge
                    key={index}
                    variant="outline"
                    onClick={() => handleClick(chip.id, chip.isGhost)}
                    className={cn(
                        "cursor-pointer gap-1 transition-colors",
                        chip.isGhost
                            ? "bg-zinc-800 border-zinc-700 text-zinc-500 line-through cursor-not-allowed"
                            : "bg-emerald-900/30 border-emerald-800 text-emerald-400 hover:bg-emerald-900/50 hover:border-emerald-700"
                    )}
                    title={chip.id}
                    aria-disabled={chip.isGhost}
                >
                    <span className="truncate max-w-[150px]">{chip.displayValue}</span>
                    {!chip.isGhost && <ExternalLink size={10} />}
                </Badge>
            ))}
        </div>
    );
};
