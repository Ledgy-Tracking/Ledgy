import React, { useEffect } from 'react';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { LedgerEntry } from '../../types/ledger';
import { RelationTagChip } from './RelationTagChip';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackLinksPanelProps {
    targetEntryId: string;
    targetLedgerId: string;
}

/**
 * Displays entries that have relation fields pointing to the target entry.
 * Shows bidirectional back-links (Story 3-3, AC 4).
 */
export const BackLinksPanel: React.FC<BackLinksPanelProps> = ({
    targetEntryId,
    targetLedgerId,
}) => {
    const { backLinks, fetchBackLinks, schemas } = useLedgerStore();
    const { activeProfileId } = useProfileStore();

    useEffect(() => {
        if (activeProfileId && targetEntryId) {
            fetchBackLinks(activeProfileId, targetEntryId);
        }
    }, [activeProfileId, targetEntryId, fetchBackLinks]);

    const entries = backLinks[targetEntryId] || [];

    if (entries.length === 0) {
        return null;
    }

    return (
        <div className="mt-4 border-t border-zinc-800 pt-4">
            <div className="flex items-center gap-2 mb-3">
                <ArrowLeft size={16} className="text-emerald-400" />
                <h3 className="text-sm font-semibold text-zinc-300">
                    Referenced By ({entries.length})
                </h3>
            </div>
            <div className="space-y-2">
                {entries.map((entry) => (
                    <BackLinkItem
                        key={entry._id}
                        entry={entry}
                        targetEntryId={targetEntryId}
                        targetLedgerId={targetLedgerId}
                    />
                ))}
            </div>
        </div>
    );
};

interface BackLinkItemProps {
    entry: LedgerEntry;
    targetEntryId: string;
    targetLedgerId: string;
}

const BackLinkItem: React.FC<BackLinkItemProps> = ({ entry, targetEntryId, targetLedgerId }) => {
    const { schemas } = useLedgerStore();
    const { profileId } = useParams<{ profileId: string }>();
    const { activeProfileId } = useProfileStore();

    // Find the schema for this entry's ledger
    const entrySchema = schemas.find(s => s.ledgerId === entry.ledgerId || s._id === entry.ledgerId);
    const ledgerName = entrySchema?.name || entry.ledgerId;

    // Find which fields in this entry reference the target
    const referencingFields: { fieldName: string; value: string | string[] }[] = [];
    for (const [fieldName, value] of Object.entries(entry.data)) {
        if (Array.isArray(value) && value.includes(targetEntryId)) {
            referencingFields.push({ fieldName, value });
        } else if (value === targetEntryId) {
            referencingFields.push({ fieldName, value: [value] });
        }
    }

    // Get display value (first field value or entry ID)
    const displayValue = entrySchema?.fields.length
        ? String(entry.data[entrySchema.fields[0].name] || entry._id)
        : entry._id;

    const navProfileId = profileId || activeProfileId;

    return (
        <div className="p-3 bg-zinc-800/30 rounded border border-zinc-700 hover:border-zinc-600 transition-colors">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <Link
                        to={`/app/${navProfileId}/ledger/${entry.ledgerId}`}
                        state={{ highlightEntryId: entry._id }}
                        className="text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:underline truncate block"
                    >
                        {displayValue}
                    </Link>
                    <div className="text-xs text-zinc-500 mt-1">
                        from <span className="text-zinc-400">{ledgerName}</span>
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    {referencingFields.map((field, idx) => (
                        <span
                            key={idx}
                            className="text-xs px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded"
                        >
                            {field.fieldName}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};
