import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from './db';
import { find_entries_with_relation_to, create_entry, create_schema } from './db';

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
