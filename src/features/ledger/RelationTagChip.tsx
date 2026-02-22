import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProfileStore } from '../../stores/useProfileStore';

interface RelationTagChipProps {
    value: string | string[];
    targetLedgerId?: string;
    entryId?: string;
    onClick?: () => void;
    isGhost?: boolean;
}

/**
 * Displays a relation field value as a clickable tag chip.
 * Supports single or multiple relations.
 * Navigates to target ledger entry on click (Story 3-3, AC 5).
 */
export const RelationTagChip: React.FC<RelationTagChipProps> = ({
    value,
    targetLedgerId,
    entryId,
    onClick,
    isGhost = false,
}) => {
    const navigate = useNavigate();
    const { profileId } = useParams<{ profileId: string }>();
    const { activeProfileId } = useProfileStore();
    const values = Array.isArray(value) ? value : [value];

    if (values.length === 0 || !values[0]) {
        return <span className="text-zinc-600 italic">-</span>;
    }

    const handleClick = () => {
        if (isGhost) return;
        
        // Call custom onClick if provided
        if (onClick) {
            onClick();
        }
        
        // Navigate to target ledger (Story 3-3, AC 5)
        if (targetLedgerId) {
            const navProfileId = profileId || activeProfileId || ':profileId';
            navigate(`/app/${navProfileId}/ledger/${targetLedgerId}`, {
                state: { highlightEntryId: entryId || values[0] }
            });
        }
    };

    return (
        <div className="flex flex-wrap gap-1">
            {values.map((val, index) => (
                <button
                    key={index}
                    onClick={handleClick}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border transition-colors ${
                        isGhost
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-500 line-through cursor-not-allowed'
                            : 'bg-emerald-900/30 border-emerald-800 text-emerald-400 hover:bg-emerald-900/50 hover:border-emerald-700 cursor-pointer'
                    }`}
                    title={targetLedgerId ? `Navigate to ${targetLedgerId}` : undefined}
                    disabled={isGhost}
                >
                    <span className="truncate max-w-[150px]">{val}</span>
                    {!isGhost && <ExternalLink size={10} />}
                </button>
            ))}
        </div>
    );
};
