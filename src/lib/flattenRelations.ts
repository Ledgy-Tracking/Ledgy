import type { LedgerEntry, LedgerSchema, FlattenedEntry, ResolvedRelationValue } from '../types/ledger';

/**
 * Returns a human-readable display value for a ledger entry.
 * Priority:
 *  1. First non-relation field with a truthy value → stringified
 *  2. Fallback: "…" + last 8 chars of entry._id
 */
export function getEntryDisplayValue(entry: LedgerEntry, schema?: LedgerSchema): string {
    if (schema) {
        for (const field of schema.fields) {
            if (field.type === 'relation') continue;
            const val = entry.data[field.name];
            if (val !== null && val !== undefined && val !== '') {
                return String(val);
            }
        }
    }
    return '…' + entry._id.slice(-8);
}

/**
 * Normalizes a relation field value to an array of non-empty UUID strings.
 * Mirrors the logic of normalizeRelationTargetIds in db.ts (inlined to avoid
 * importing PouchDB-coupled modules).
 */
function normalizeIds(value: unknown): string[] {
    if (typeof value === 'string' && value.trim().length > 0) {
        return [value];
    }
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }
    return [];
}

/**
 * Flattens a single entry by resolving its relation fields to human-readable values.
 *
 * @param entry              The entry to flatten.
 * @param schema             The schema for this entry (may be undefined).
 * @param allEntriesByLedgerId  All loaded entries keyed by ledgerId/schemaId.
 * @param allSchemasBySchemaId  All loaded schemas keyed by schema _id.
 * @param depth              Current recursion depth (0 = root call).
 * @param maxDepth           Maximum recursion depth (default 3).
 * @param visited            Set of entry _ids already visited in this chain (cycle prevention).
 */
export function flattenEntry(
    entry: LedgerEntry,
    schema: LedgerSchema | undefined,
    allEntriesByLedgerId: Record<string, LedgerEntry[]>,
    allSchemasBySchemaId: Record<string, LedgerSchema>,
    depth: number,
    maxDepth: number,
    visited: Set<string>
): FlattenedEntry {
    if (!schema) {
        return { ...entry, resolvedRelations: {} };
    }

    const resolvedRelations: Record<string, ResolvedRelationValue[]> = {};

    for (const field of schema.fields) {
        if (field.type !== 'relation') continue;

        const ids = normalizeIds(entry.data[field.name]);
        if (ids.length === 0) continue;

        const resolved: ResolvedRelationValue[] = [];

        for (const id of ids) {
            // Cycle detection
            if (visited.has(id)) {
                resolved.push({ id, displayValue: '[Circular]', isGhost: false });
                continue;
            }

            // Look up target entry
            const targetLedgerId = field.relationTarget ?? '';
            const targetEntries = allEntriesByLedgerId[targetLedgerId] ?? [];
            const targetEntry = targetEntries.find(e => e._id === id);

            // Ghost: not found or soft-deleted
            if (!targetEntry || targetEntry.isDeleted) {
                resolved.push({ id, displayValue: '[Deleted]', isGhost: true });
                continue;
            }

            if (depth >= maxDepth) {
                // Depth exhausted — show display value without further recursion
                const targetSchema = allSchemasBySchemaId[targetEntry.schemaId ?? targetLedgerId];
                resolved.push({
                    id,
                    displayValue: getEntryDisplayValue(targetEntry, targetSchema),
                    isGhost: false,
                });
                continue;
            }

            // Recurse into target, passing a copy of visited (siblings don't block each other)
            const nextVisited = new Set(visited);
            nextVisited.add(id);
            const targetSchema = allSchemasBySchemaId[targetEntry.schemaId ?? targetLedgerId];
            const flattened = flattenEntry(
                targetEntry,
                targetSchema,
                allEntriesByLedgerId,
                allSchemasBySchemaId,
                depth + 1,
                maxDepth,
                nextVisited
            );

            resolved.push({
                id,
                displayValue: getEntryDisplayValue(targetEntry, targetSchema),
                isGhost: false,
            });
            // flattened is computed but we only need the display value at this level;
            // deeper resolution is embedded in the returned FlattenedEntry structure if needed.
            void flattened;
        }

        if (resolved.length > 0) {
            resolvedRelations[field.name] = resolved;
        }
    }

    return { ...entry, resolvedRelations };
}

/**
 * Flattens an array of entries by resolving relation fields for each.
 * Each entry gets a fresh visited Set so unrelated entries don't interfere.
 */
export function flattenEntries(
    entries: LedgerEntry[],
    schema: LedgerSchema | undefined,
    allEntriesByLedgerId: Record<string, LedgerEntry[]>,
    allSchemasBySchemaId: Record<string, LedgerSchema>,
    maxDepth = 3
): FlattenedEntry[] {
    return entries.map(entry =>
        flattenEntry(entry, schema, allEntriesByLedgerId, allSchemasBySchemaId, 0, maxDepth, new Set())
    );
}
