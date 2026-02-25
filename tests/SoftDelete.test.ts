import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../src/lib/db';
import { find_entries_with_relation_to, create_entry, create_schema, delete_entry, restore_entry, list_entries, list_all_entries } from '../src/lib/db';

describe('find_entries_with_relation_to', () => {
    let db: Database;
    const testProfileId = 'test-profile-123';

    beforeEach(async () => {
        db = new Database(testProfileId);
        // Clean up any existing data
        const allDocs = await db.getAllDocuments<any>('entry');
        for (const doc of allDocs) {
            await db.updateDocument(doc._id, { isDeleted: true });
        }
    });

    it('returns empty array when no entries reference the target', async () => {
        // Create an entry without relations
        await create_entry(db, 'schema:1', 'ledger:1', {
            name: 'Test Entry',
            value: 42,
        }, testProfileId);

        const result = await find_entries_with_relation_to(db, 'entry:nonexistent');
        expect(result).toEqual([]);
    });

    it('finds entry with single relation to target', async () => {
        const targetEntryId = 'entry:target-123';
        
        // Create target entry
        await db.createDocument('entry', {
            _id: targetEntryId,
            schemaId: 'schema:1',
            ledgerId: 'ledger:1',
            data: { name: 'Target Entry' },
            profileId: testProfileId,
        });

        // Create entry with relation to target
        await create_entry(db, 'schema:1', 'ledger:1', {
            name: 'Related Entry',
            relation: targetEntryId,
        }, testProfileId);

        const result = await find_entries_with_relation_to(db, targetEntryId);
        expect(result).toHaveLength(1);
        expect(result[0].data.relation).toBe(targetEntryId);
    });

    it('finds entry with multiple relations including target', async () => {
        const targetEntryId = 'entry:target-456';
        const otherEntryId = 'entry:other-789';
        
        // Create entries
        await db.createDocument('entry', {
            _id: targetEntryId,
            schemaId: 'schema:1',
            ledgerId: 'ledger:1',
            data: { name: 'Target Entry' },
            profileId: testProfileId,
        });

        await create_entry(db, 'schema:1', 'ledger:1', {
            name: 'Multi-Relation Entry',
            relations: [targetEntryId, otherEntryId],
        }, testProfileId);

        const result = await find_entries_with_relation_to(db, targetEntryId);
        expect(result).toHaveLength(1);
        expect(result[0].data.relations).toContain(targetEntryId);
    });

    it('excludes soft-deleted entries from results', async () => {
        const targetEntryId = 'entry:target-deleted';

        // Create entry with relation
        const entryId = await create_entry(db, 'schema:1', 'ledger:1', {
            name: 'Deleted Related Entry',
            relation: targetEntryId,
        }, testProfileId);

        // Soft-delete the entry (entryId is already the full document ID)
        await db.updateDocument(entryId, { isDeleted: true });

        const result = await find_entries_with_relation_to(db, targetEntryId);
        expect(result).toEqual([]);
    });

    it('finds multiple entries referencing the same target', async () => {
        const targetEntryId = 'entry:common-target';
        
        // Create multiple entries with relation to same target
        await create_entry(db, 'schema:1', 'ledger:1', {
            name: 'Related Entry 1',
            relation: targetEntryId,
        }, testProfileId);

        await create_entry(db, 'schema:1', 'ledger:1', {
            name: 'Related Entry 2',
            relation: targetEntryId,
        }, testProfileId);

        const result = await find_entries_with_relation_to(db, targetEntryId);
        expect(result).toHaveLength(2);
    });

    it('handles entries with multiple relation fields', async () => {
        const targetEntryId = 'entry:multi-field-target';

        await create_entry(db, 'schema:1', 'ledger:1', {
            name: 'Multi-Field Entry',
            relation1: targetEntryId,
            relation2: 'entry:other-target',
        }, testProfileId);

        const result = await find_entries_with_relation_to(db, targetEntryId);
        expect(result).toHaveLength(1);
        expect(result[0].data.relation1).toBe(targetEntryId);
    });
});

describe('soft-delete and restore (Story 3-4)', () => {
    let db: Database;
    const testProfileId = 'test-profile-restore';

    beforeEach(async () => {
        db = new Database(testProfileId);
        // Clean up any existing data
        const allDocs = await db.getAllDocuments<any>('entry');
        for (const doc of allDocs) {
            await db.updateDocument(doc._id, { isDeleted: true });
        }
    });

    it('delete_entry sets soft-delete flags', async () => {
        const entryId = await create_entry(db, 'schema:1', 'ledger:1', {
            name: 'Test Entry',
        }, testProfileId);

        await delete_entry(db, entryId);

        const entry = await db.getDocument<any>(entryId);
        expect(entry.isDeleted).toBe(true);
        expect(entry.deletedAt).toBeDefined();
    });

    it('restore_entry unsets soft-delete flags', async () => {
        const entryId = await create_entry(db, 'schema:1', 'ledger:1', {
            name: 'Test Entry',
        }, testProfileId);

        await delete_entry(db, entryId);
        await restore_entry(db, entryId);

        const entry = await db.getDocument<any>(entryId);
        expect(entry.isDeleted).toBe(false);
        expect(entry.deletedAt).toBeUndefined();
    });

    it('list_entries excludes soft-deleted entries', async () => {
        const entryId1 = await create_entry(db, 'schema:1', 'ledger:1', {
            name: 'Entry 1',
        }, testProfileId);

        const entryId2 = await create_entry(db, 'schema:1', 'ledger:1', {
            name: 'Entry 2',
        }, testProfileId);

        await delete_entry(db, entryId1);

        const entries = await list_entries(db, 'ledger:1');
        expect(entries).toHaveLength(1);
        expect(entries[0].data.name).toBe('Entry 2');
    });

    it('list_all_entries includes soft-deleted entries', async () => {
        const uniqueLedgerId = 'ledger:all-entries-test';
        const entryId1 = await create_entry(db, 'schema:1', uniqueLedgerId, {
            name: 'Entry 1',
        }, testProfileId);

        const entryId2 = await create_entry(db, 'schema:1', uniqueLedgerId, {
            name: 'Entry 2',
        }, testProfileId);

        await delete_entry(db, entryId1);

        const allEntries = await list_all_entries(db, uniqueLedgerId);
        expect(allEntries).toHaveLength(2);
    });

    it('restored entry appears in list_entries', async () => {
        const entryId = await create_entry(db, 'schema:1', 'ledger:1', {
            name: 'Test Entry',
        }, testProfileId);

        await delete_entry(db, entryId);
        
        let entries = await list_entries(db, 'ledger:1');
        expect(entries).toHaveLength(0);

        await restore_entry(db, entryId);

        entries = await list_entries(db, 'ledger:1');
        expect(entries).toHaveLength(1);
        expect(entries[0].data.name).toBe('Test Entry');
    });
});
