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
 * @param _depth             Reserved — vestigial, not used for display logic.
 * @param _maxDepth          Reserved — vestigial, not used for display logic.
 * @param visited            Set of entry _ids to treat as already-visited (cycle prevention).
 */
export function flattenEntry(
    entry: LedgerEntry,
    schema: LedgerSchema | undefined,
    allEntriesByLedgerId: Record<string, LedgerEntry[]>,
    allSchemasBySchemaId: Record<string, LedgerSchema>,
    _depth: number,
    _maxDepth: number,
    visited: Set<string>
): FlattenedEntry {
    if (!schema) {
        return { ...entry, resolvedRelations: {} };
    }

    // Pre-seed with this entry's own _id so that any back-reference to the current entry
    // is detected as circular rather than recursed into.
    const effectiveVisited = new Set(visited);
    effectiveVisited.add(entry._id);

    const resolvedRelations: Record<string, ResolvedRelationValue[]> = {};

    for (const field of schema.fields) {
        if (field.type !== 'relation') continue;

        const ids = normalizeIds(entry.data[field.name]);
        if (ids.length === 0) continue;

        const resolved: ResolvedRelationValue[] = [];

        for (const id of ids) {
            // Cycle detection — id is already in the ancestor chain
            if (effectiveVisited.has(id)) {
                resolved.push({ id, displayValue: '[Circular]', isGhost: true });
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

            // Resolve display value from the target entry's own non-relation fields
            const targetSchema = allSchemasBySchemaId[targetEntry.schemaId ?? targetLedgerId];
            resolved.push({
                id,
                displayValue: getEntryDisplayValue(targetEntry, targetSchema),
                isGhost: false,
            });
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
