import React, { useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useErrorStore } from '../../stores/useErrorStore';
import { getProfileDb } from '../../lib/db';

interface BulkActionBarProps {
    schemaId: string;
}

interface BulkOperationResult {
    success: number;
    failed: number;
}

type PouchResult = { error?: string };
type LocalPouchDb = {
    get: <T = Record<string, unknown>>(id: string) => Promise<T>;
    bulkDocs: (docs: Record<string, unknown>[]) => Promise<PouchResult[]>;
};

const MAX_BATCH_SIZE = 5000;

function chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

async function batchDeleteEntries(
    db: LocalPouchDb,
    entryIds: string[]
): Promise<BulkOperationResult> {
    let success = 0;
    let failed = 0;

    for (const idBatch of chunk(entryIds, MAX_BATCH_SIZE)) {
        const currentDocs = await Promise.all(
            idBatch.map((id) => db.get<{ _id: string; _rev: string }>(id).catch(() => null))
        );

        const deletionDocs = currentDocs
            .filter((doc): doc is { _id: string; _rev: string } => Boolean(doc))
            .map((doc) => ({
                _id: doc._id,
                _rev: doc._rev,
                _deleted: true,
            }));

        if (deletionDocs.length === 0) {
            failed += idBatch.length;
            continue;
        }

        const results = await db.bulkDocs(deletionDocs);
        success += results.filter((result) => !(result as PouchResult).error).length;
        failed += results.filter((result) => Boolean((result as PouchResult).error)).length;
        failed += idBatch.length - deletionDocs.length;
    }

    return { success, failed };
}

async function batchAssignTag(
    db: LocalPouchDb,
    entryIds: string[],
    tagValue: string
): Promise<BulkOperationResult> {
    let success = 0;
    let failed = 0;

    for (const idBatch of chunk(entryIds, MAX_BATCH_SIZE)) {
        const docs = await Promise.all(idBatch.map((id) => db.get<Record<string, unknown>>(id).catch(() => null)));
        const updateDocs: Record<string, unknown>[] = [];
        for (const doc of docs) {
            if (!doc || typeof doc._id !== 'string') {
                continue;
            }

            const currentData = (doc.data as Record<string, unknown> | undefined) ?? {};
            const currentTags = Array.isArray(currentData.tags)
                ? currentData.tags.filter((tag): tag is string => typeof tag === 'string')
                : [];

            updateDocs.push({
                ...doc,
                data: {
                    ...currentData,
                    tags: Array.from(new Set([...currentTags, tagValue])).filter(Boolean),
                },
            });
        }

        if (updateDocs.length === 0) {
            failed += idBatch.length;
            continue;
        }

        const results = await db.bulkDocs(updateDocs);
        success += results.filter((result) => !(result as PouchResult).error).length;
        failed += results.filter((result) => Boolean((result as PouchResult).error)).length;
        failed += idBatch.length - updateDocs.length;
    }

    return { success, failed };
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({ schemaId }) => {
    const ledgerStore = useLedgerStore();
    const { activeProfileId } = useProfileStore();
    const { addNotification } = useNotificationStore();
    const { dispatchError } = useErrorStore();

    const selectedRowIds = ledgerStore.selectedRowIds ?? new Set<string>();
    const clearSelection = ledgerStore.clearSelection ?? (() => undefined);
    const fetchEntries = ledgerStore.fetchEntries;
    const schemas = ledgerStore.schemas;
    const entries = ledgerStore.entries;

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [tagDialogOpen, setTagDialogOpen] = useState(false);
    const [tagInput, setTagInput] = useState('');

    const selectedIds = useMemo(() => Array.from(selectedRowIds), [selectedRowIds]);
    const selectedCount = selectedIds.length;
    const currentSchema = useMemo(() => schemas.find((schema) => schema._id === schemaId), [schemaId, schemas]);
    const existingTags = useMemo(() => {
        const rowEntries = entries[schemaId] ?? [];
        const tags = rowEntries.flatMap((entry) => {
            const rawTags = entry.data.tags;
            if (!Array.isArray(rawTags)) {
                return [];
            }
            return rawTags.filter((tag): tag is string => typeof tag === 'string');
        });
        return Array.from(new Set(tags)).sort((a, b) => a.localeCompare(b));
    }, [entries, schemaId]);

    if (selectedCount < 1) {
        return null;
    }

    const hasTagsField = currentSchema?.fields.some((field) => field.name.toLowerCase() === 'tags') ?? false;

    const handleBulkDelete = async () => {
        if (!activeProfileId) {
            dispatchError('No active profile selected');
            return;
        }

        const db = getProfileDb(activeProfileId) as unknown as { db: LocalPouchDb };
        const result = await batchDeleteEntries(db.db, selectedIds);
        await fetchEntries(activeProfileId, schemaId);

        if (result.failed === 0) {
            clearSelection();
            addNotification(`${result.success} entries deleted`, 'success');
        } else {
            dispatchError(`Failed to delete ${result.failed} entries`);
        }

        setDeleteDialogOpen(false);
    };

    const handleOpenTagDialog = () => {
        if (!hasTagsField) {
            dispatchError('Current schema does not support tags. Edit schema first.');
            return;
        }
        setTagDialogOpen(true);
    };

    const handleBulkAssignTag = async () => {
        const trimmedTag = tagInput.trim();
        if (!trimmedTag) {
            dispatchError('Tag value is required');
            return;
        }

        if (!activeProfileId) {
            dispatchError('No active profile selected');
            return;
        }

        const db = getProfileDb(activeProfileId) as unknown as { db: LocalPouchDb };
        const result = await batchAssignTag(db.db, selectedIds, trimmedTag);
        await fetchEntries(activeProfileId, schemaId);

        if (result.failed === 0) {
            clearSelection();
            addNotification(`Tagged ${result.success} entries`, 'success');
        } else {
            dispatchError(`Failed to tag ${result.failed} entries`);
        }

        setTagDialogOpen(false);
        setTagInput('');
    };

    return (
        <>
            <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 shadow-xl">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        {selectedCount} entries selected
                    </span>
                    <Button size="sm" onClick={() => setDeleteDialogOpen(true)} disabled={selectedCount === 0}>
                        Delete Selected
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleOpenTagDialog} disabled={selectedCount === 0}>
                        Assign Tag
                    </Button>
                </div>
            </div>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete {selectedCount} entries?</DialogTitle>
                        <DialogDescription>
                            Delete {selectedCount} entries? This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleBulkDelete}>Confirm Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign tag to {selectedCount} entries</DialogTitle>
                        <DialogDescription>
                            Choose an existing tag or create a new one.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Input
                            aria-label="Tag value"
                            placeholder="Enter tag"
                            list="bulk-tag-options"
                            value={tagInput}
                            onChange={(event) => setTagInput(event.target.value)}
                        />
                        <datalist id="bulk-tag-options">
                            {existingTags.map((tag) => (
                                <option key={tag} value={tag} />
                            ))}
                        </datalist>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTagDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleBulkAssignTag}>Apply Tag</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
