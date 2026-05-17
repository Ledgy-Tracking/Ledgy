import React, { useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { LedgerEntry } from '../../types/ledger';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

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
    const { profileId } = useParams<{ profileId: string }>();
    const navProfileId = profileId || activeProfileId;

    const schemasMap = useMemo(() => {
        const map = new Map();
        schemas.forEach(s => map.set(s._id, s));
        return map;
    }, [schemas]);

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
        <div className="mt-4 border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <div className="flex items-center gap-2 mb-3">
                <ArrowLeft size={16} className="text-emerald-400" />
                <h3 className="text-sm font-semibold text-zinc-300">
                    Referenced By ({entries.filter(e => !e.isDeleted).length})
                </h3>
            </div>
            <div className="space-y-2">
                {entries.filter(e => !e.isDeleted).map((entry) => (
                    <BackLinkItem
                        key={entry._id}
                        entry={entry}
                        targetEntryId={targetEntryId}
                        targetLedgerId={targetLedgerId}
                        entrySchema={schemasMap.get(entry.schemaId)}
                        navProfileId={navProfileId || undefined}
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
    entrySchema?: any;
    navProfileId?: string;
}

const BackLinkItem: React.FC<BackLinkItemProps> = ({ entry, targetEntryId, entrySchema, navProfileId }) => {
    const ledgerName = entrySchema?.name || entry.ledgerId;

    // Find which fields in this entry reference the target
    const referencingFields: { fieldName: string; value: string | string[] }[] = [];

    if (entrySchema?.fields) {
        const relationFields = entrySchema.fields.filter((f: any) => f.type === 'relation');
        for (const field of relationFields) {
            const value = entry.data[field.name];
            if (value) {
                if (Array.isArray(value) && value.includes(targetEntryId)) {
                    referencingFields.push({ fieldName: field.name, value });
                } else if (value === targetEntryId) {
                    referencingFields.push({ fieldName: field.name, value: [value] });
                }
            }
        }
    } else {
        // Fallback for missing schema
        for (const [fieldName, value] of Object.entries(entry.data)) {
            if (Array.isArray(value) && value.includes(targetEntryId)) {
                referencingFields.push({ fieldName, value });
            } else if (value === targetEntryId) {
                referencingFields.push({ fieldName, value: [value] });
            }
        }
    }

    // Get display value (first field value or entry ID)
    const displayValue = entrySchema?.fields.length
        ? String(entry.data[entrySchema.fields[0].name] || entry._id)
        : entry._id;

    return (
        <Card className="p-3 bg-gray-100 dark:bg-zinc-800/30 rounded border border-zinc-300 dark:border-zinc-700 hover:border-zinc-600 transition-colors">
            <CardContent>
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
                            <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs bg-zinc-700 text-zinc-300 w-fit"
                            >
                                {field.fieldName}
                            </Badge>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
