import { describe, it, expect } from 'vitest';
import { flattenEntry, flattenEntries, getEntryDisplayValue } from './flattenRelations';
import type { LedgerEntry, LedgerSchema } from '../types/ledger';

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function makeEntry(
    id: string,
    schemaId: string,
    data: Record<string, unknown>,
    overrides: Partial<LedgerEntry> = {}
): LedgerEntry {
    return {
        _id: id,
        type: 'entry',
        schemaId,
        ledgerId: schemaId,
        profileId: 'profile:1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        schema_version: 1,
        data,
        ...overrides,
    };
}

function makeSchema(id: string, fields: LedgerSchema['fields']): LedgerSchema {
    return {
        _id: id,
        type: 'schema',
        name: 'Test',
        profileId: 'profile:1',
        projectId: 'project:1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        schema_version: 1,
        fields,
    };
}

// ────────────────────────────────────────────────────────────
// getEntryDisplayValue
// ────────────────────────────────────────────────────────────

describe('getEntryDisplayValue', () => {
    it('returns first truthy non-relation field value', () => {
        const schema = makeSchema('s:1', [{ name: 'title', type: 'text' }]);
        const entry = makeEntry('e:1', 's:1', { title: 'Hello' });
        expect(getEntryDisplayValue(entry, schema)).toBe('Hello');
    });

    it('skips relation fields and empty values', () => {
        const schema = makeSchema('s:1', [
            { name: 'ref', type: 'relation', relationTarget: 's:2' },
            { name: 'name', type: 'text' },
        ]);
        const entry = makeEntry('e:1', 's:1', { ref: 'e:2', name: 'World' });
        expect(getEntryDisplayValue(entry, schema)).toBe('World');
    });

    it('falls back to UUID suffix when no displayable field', () => {
        const schema = makeSchema('s:1', [{ name: 'title', type: 'text' }]);
        const entry = makeEntry('e:12345678abcdef', 's:1', { title: '' });
        // entry._id = 'e:12345678abcdef' → last 8 chars = '78abcdef'
        expect(getEntryDisplayValue(entry, schema)).toBe('…78abcdef');
    });

    it('falls back to UUID suffix when schema is undefined', () => {
        const entry = makeEntry('e:0000abcd', 's:1', { title: 'Whatever' });
        expect(getEntryDisplayValue(entry, undefined)).toBe('…0000abcd');
    });
});

// ────────────────────────────────────────────────────────────
// flattenEntry
// ────────────────────────────────────────────────────────────

describe('flattenEntry', () => {
    it('3.1 — basic resolution: UUID → display value from target entry', () => {
        const schemaA = makeSchema('s:A', [{ name: 'ref', type: 'relation', relationTarget: 's:B' }]);
        const schemaB = makeSchema('s:B', [{ name: 'name', type: 'text' }]);
        const entryA = makeEntry('e:A', 's:A', { ref: 'e:B' });
        const entryB = makeEntry('e:B', 's:B', { name: 'Bob' });

        const result = flattenEntry(
            entryA,
            schemaA,
            { 's:B': [entryB] },
            { 's:A': schemaA, 's:B': schemaB },
            0, 3, new Set()
        );

        expect(result.resolvedRelations?.ref).toHaveLength(1);
        expect(result.resolvedRelations?.ref?.[0].displayValue).toBe('Bob');
        expect(result.resolvedRelations?.ref?.[0].isGhost).toBe(false);
        expect(result.resolvedRelations?.ref?.[0].id).toBe('e:B');
    });

    it('3.2 — multi-value: two UUIDs → two resolved chips', () => {
        const schemaA = makeSchema('s:A', [{ name: 'refs', type: 'relation', relationTarget: 's:B' }]);
        const schemaB = makeSchema('s:B', [{ name: 'name', type: 'text' }]);
        const entryA = makeEntry('e:A', 's:A', { refs: ['e:B1', 'e:B2'] });
        const entryB1 = makeEntry('e:B1', 's:B', { name: 'Alice' });
        const entryB2 = makeEntry('e:B2', 's:B', { name: 'Bob' });

        const result = flattenEntry(
            entryA,
            schemaA,
            { 's:B': [entryB1, entryB2] },
            { 's:A': schemaA, 's:B': schemaB },
            0, 3, new Set()
        );

        expect(result.resolvedRelations?.refs).toHaveLength(2);
        expect(result.resolvedRelations?.refs?.[0].displayValue).toBe('Alice');
        expect(result.resolvedRelations?.refs?.[1].displayValue).toBe('Bob');
    });

    it('3.3 — depth limit: A→B→C resolves all three; 4th level stops at display value', () => {
        const schemaA = makeSchema('s:A', [{ name: 'ref', type: 'relation', relationTarget: 's:B' }]);
        const schemaB = makeSchema('s:B', [{ name: 'ref', type: 'relation', relationTarget: 's:C' }]);
        const schemaC = makeSchema('s:C', [{ name: 'ref', type: 'relation', relationTarget: 's:D' }]);
        const schemaD = makeSchema('s:D', [{ name: 'name', type: 'text' }]);

        const entryA = makeEntry('e:A', 's:A', { ref: 'e:B' });
        const entryB = makeEntry('e:B', 's:B', { ref: 'e:C' });
        const entryC = makeEntry('e:C', 's:C', { ref: 'e:D00000001' });
        const entryD = makeEntry('e:D00000001', 's:D', { name: 'Deep' });

        const allEntries = { 's:B': [entryB], 's:C': [entryC], 's:D': [entryD] };
        const allSchemas = { 's:A': schemaA, 's:B': schemaB, 's:C': schemaC, 's:D': schemaD };

        // A (depth=0) resolves B: B's first non-relation field is empty (only has 'ref'), falls back to UUID suffix
        const resultA = flattenEntry(entryA, schemaA, allEntries, allSchemas, 0, 3, new Set());
        expect(resultA.resolvedRelations?.ref?.[0].displayValue).toBe('…' + entryB._id.slice(-8));
        expect(resultA.resolvedRelations?.ref?.[0].isGhost).toBe(false);

        // C (depth=2) resolves D: depth(2) < maxDepth(3), so D's 'name' field is used
        const resultC = flattenEntry(entryC, schemaC, allEntries, allSchemas, 2, 3, new Set());
        expect(resultC.resolvedRelations?.ref?.[0].displayValue).toBe('Deep');

        // C at depth=3 (exhausted): still returns D's display value, but does not recurse
        const resultC2 = flattenEntry(entryC, schemaC, allEntries, allSchemas, 3, 3, new Set());
        expect(resultC2.resolvedRelations?.ref?.[0].displayValue).toBe('Deep');
    });

    it('3.4 — ghost: isDeleted:true → displayValue "[Deleted]", isGhost true', () => {
        const schemaA = makeSchema('s:A', [{ name: 'ref', type: 'relation', relationTarget: 's:B' }]);
        const schemaB = makeSchema('s:B', [{ name: 'name', type: 'text' }]);
        const entryA = makeEntry('e:A', 's:A', { ref: 'e:B' });
        const entryB = makeEntry('e:B', 's:B', { name: 'Gone' }, { isDeleted: true });

        const result = flattenEntry(entryA, schemaA, { 's:B': [entryB] }, { 's:B': schemaB }, 0, 3, new Set());
        expect(result.resolvedRelations?.ref?.[0].displayValue).toBe('[Deleted]');
        expect(result.resolvedRelations?.ref?.[0].isGhost).toBe(true);
    });

    it('3.5 — missing entry: UUID not found → "[Deleted]", isGhost true', () => {
        const schemaA = makeSchema('s:A', [{ name: 'ref', type: 'relation', relationTarget: 's:B' }]);
        const entryA = makeEntry('e:A', 's:A', { ref: 'e:MISSING' });

        const result = flattenEntry(entryA, schemaA, { 's:B': [] }, {}, 0, 3, new Set());
        expect(result.resolvedRelations?.ref?.[0].displayValue).toBe('[Deleted]');
        expect(result.resolvedRelations?.ref?.[0].isGhost).toBe(true);
    });

    it('3.6 — cycle: A.ref=B, B.ref=A → second visit returns "[Circular]", isGhost true', () => {
        const schemaA = makeSchema('s:A', [{ name: 'ref', type: 'relation', relationTarget: 's:B' }]);
        const schemaB = makeSchema('s:B', [{ name: 'ref', type: 'relation', relationTarget: 's:A' }]);
        const entryA = makeEntry('e:A', 's:A', { ref: 'e:B' });
        const entryB = makeEntry('e:B', 's:B', { ref: 'e:A' });

        const allEntries = { 's:A': [entryA], 's:B': [entryB] };
        const allSchemas = { 's:A': schemaA, 's:B': schemaB };

        // Start with e:A in visited so B→A is immediately cyclic
        const visited = new Set<string>(['e:A']);
        const result = flattenEntry(entryA, schemaA, allEntries, allSchemas, 0, 3, visited);
        // e:B is resolved normally from e:A's perspective
        // but when flattenEntry for e:B tries to resolve e:A, e:A is in visited → [Circular]
        expect(result.resolvedRelations?.ref?.[0].displayValue).not.toBe('[Circular]'); // B itself is not circular
        // B's resolution of A would be [Circular], but we only check A's resolution here
        expect(result.resolvedRelations?.ref?.[0].isGhost).toBe(false);

        // Direct cycle test: B trying to resolve A when A is in visited
        const visitedB = new Set<string>(['e:A']);
        const resultB = flattenEntry(entryB, schemaB, allEntries, allSchemas, 0, 3, visitedB);
        expect(resultB.resolvedRelations?.ref?.[0].displayValue).toBe('[Circular]');
        expect(resultB.resolvedRelations?.ref?.[0].isGhost).toBe(true);
    });

    it('3.7 — missing schema: schema undefined → resolvedRelations is empty {}', () => {
        const entry = makeEntry('e:A', 's:A', { ref: 'e:B' });
        const result = flattenEntry(entry, undefined, {}, {}, 0, 3, new Set());
        expect(result.resolvedRelations).toEqual({});
    });

    it('3.8 — no relation fields: schema with text/number only → resolvedRelations is empty {}', () => {
        const schema = makeSchema('s:A', [
            { name: 'name', type: 'text' },
            { name: 'count', type: 'number' },
        ]);
        const entry = makeEntry('e:A', 's:A', { name: 'Test', count: 5 });
        const result = flattenEntry(entry, schema, {}, { 's:A': schema }, 0, 3, new Set());
        expect(result.resolvedRelations).toEqual({});
    });
});

// ────────────────────────────────────────────────────────────
// flattenEntries
// ────────────────────────────────────────────────────────────

describe('flattenEntries', () => {
    it('maps each entry with a fresh visited set', () => {
        const schemaA = makeSchema('s:A', [{ name: 'ref', type: 'relation', relationTarget: 's:B' }]);
        const schemaB = makeSchema('s:B', [{ name: 'name', type: 'text' }]);
        const entryA1 = makeEntry('e:A1', 's:A', { ref: 'e:B' });
        const entryA2 = makeEntry('e:A2', 's:A', { ref: 'e:B' });
        const entryB = makeEntry('e:B', 's:B', { name: 'Shared' });

        const results = flattenEntries(
            [entryA1, entryA2],
            schemaA,
            { 's:B': [entryB] },
            { 's:A': schemaA, 's:B': schemaB }
        );

        expect(results).toHaveLength(2);
        expect(results[0].resolvedRelations?.ref?.[0].displayValue).toBe('Shared');
        expect(results[1].resolvedRelations?.ref?.[0].displayValue).toBe('Shared');
    });
});
