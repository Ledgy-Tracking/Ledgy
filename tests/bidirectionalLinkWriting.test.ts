import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Database, create_entry, create_schema, delete_entry, find_entries_with_relation_to, restore_entry, update_entry } from '../src/lib/db';
import { useErrorStore } from '../src/stores/useErrorStore';
import { BackLinkMetadata, LedgerEntry } from '../src/types/ledger';

describe('bidirectional backlink writing (Story 3.13)', () => {
    let db: Database;
    const profileId = 'test-profile-bidirectional';
    let sourceSchemaId: string;
    let targetSchemaId: string;

    beforeEach(async () => {
        db = new Database(profileId);
        sourceSchemaId = await create_schema(
            db,
            'Source Schema',
            [
                { name: 'name', type: 'text' },
                { name: 'singleRef', type: 'relation', relationTarget: 'ledger:target' },
                { name: 'multiRefs', type: 'relation', relationTarget: 'ledger:target' },
                { name: 'ignoredField', type: 'text' },
            ],
            profileId,
            'project:test'
        );
        targetSchemaId = await create_schema(
            db,
            'Target Schema',
            [{ name: 'name', type: 'text' }],
            profileId,
            'project:test'
        );
    });

    afterEach(async () => {
        await db.destroy();
    });

    function backLinkIdentity(backLink: BackLinkMetadata): string {
        return `${backLink.sourceEntryId}::${backLink.sourceSchemaId}::${backLink.sourceLedgerId}::${backLink.relationField}`;
    }

    function assertTargetBackLinks(
        entry: LedgerEntry,
        expected: BackLinkMetadata[]
    ) {
        const actual = (entry.backLinks ?? []).map(backLinkIdentity).sort();
        const expectedIds = expected.map(backLinkIdentity).sort();
        expect(actual).toEqual(expectedIds);
    }

    it('writes backlinks on create for single and multi relations', async () => {
        const targetA = await create_entry(db, targetSchemaId, 'ledger:target', { name: 'Target A' }, profileId);
        const targetB = await create_entry(db, targetSchemaId, 'ledger:target', { name: 'Target B' }, profileId);

        const sourceEntryId = await create_entry(
            db,
            sourceSchemaId,
            'ledger:source',
            {
                name: 'Source Entry',
                singleRef: targetA,
                multiRefs: [targetA, targetB, targetA],
                ignoredField: `${targetA},${targetB}`,
            },
            profileId
        );

        const refreshedTargetA = await db.getDocument<LedgerEntry>(targetA);
        const refreshedTargetB = await db.getDocument<LedgerEntry>(targetB);

        assertTargetBackLinks(refreshedTargetA, [
            {
                sourceEntryId,
                sourceSchemaId,
                sourceLedgerId: 'ledger:source',
                relationField: 'singleRef',
            },
            {
                sourceEntryId,
                sourceSchemaId,
                sourceLedgerId: 'ledger:source',
                relationField: 'multiRefs',
            },
        ]);
        assertTargetBackLinks(refreshedTargetB, [
            {
                sourceEntryId,
                sourceSchemaId,
                sourceLedgerId: 'ledger:source',
                relationField: 'multiRefs',
            },
        ]);
    });

    it('reconciles backlink add/remove on update and remains idempotent', async () => {
        const targetA = await create_entry(db, targetSchemaId, 'ledger:target', { name: 'Target A' }, profileId);
        const targetB = await create_entry(db, targetSchemaId, 'ledger:target', { name: 'Target B' }, profileId);

        const sourceEntryId = await create_entry(
            db,
            sourceSchemaId,
            'ledger:source',
            { name: 'Source Entry', singleRef: targetA },
            profileId
        );

        await update_entry(db, sourceEntryId, {
            name: 'Source Entry Updated',
            singleRef: targetB,
            multiRefs: [targetB],
        });

        const refreshedTargetA = await db.getDocument<LedgerEntry>(targetA);
        const refreshedTargetB = await db.getDocument<LedgerEntry>(targetB);

        assertTargetBackLinks(refreshedTargetA, []);
        assertTargetBackLinks(refreshedTargetB, [
            {
                sourceEntryId,
                sourceSchemaId,
                sourceLedgerId: 'ledger:source',
                relationField: 'singleRef',
            },
            {
                sourceEntryId,
                sourceSchemaId,
                sourceLedgerId: 'ledger:source',
                relationField: 'multiRefs',
            },
        ]);

        await update_entry(db, sourceEntryId, {
            name: 'Source Entry Updated',
            singleRef: targetB,
            multiRefs: [targetB, targetB],
        });

        const idempotentTargetB = await db.getDocument<LedgerEntry>(targetB);
        expect(idempotentTargetB.backLinks ?? []).toHaveLength(2);
    });

    it('removes backlinks on soft delete and restores them on restore', async () => {
        const targetA = await create_entry(db, targetSchemaId, 'ledger:target', { name: 'Target A' }, profileId);

        const sourceEntryId = await create_entry(
            db,
            sourceSchemaId,
            'ledger:source',
            { name: 'Source Entry', singleRef: targetA },
            profileId
        );

        await delete_entry(db, sourceEntryId);
        const afterDelete = await db.getDocument<LedgerEntry>(targetA);
        assertTargetBackLinks(afterDelete, []);

        await restore_entry(db, sourceEntryId);
        const afterRestore = await db.getDocument<LedgerEntry>(targetA);
        assertTargetBackLinks(afterRestore, [
            {
                sourceEntryId,
                sourceSchemaId,
                sourceLedgerId: 'ledger:source',
                relationField: 'singleRef',
            },
        ]);
    });

    it('keeps fallback relation query working for BackLinksPanel path', async () => {
        const targetA = await create_entry(db, targetSchemaId, 'ledger:target', { name: 'Target A' }, profileId);

        const sourceEntryId = await create_entry(
            db,
            sourceSchemaId,
            'ledger:source',
            { name: 'Source Entry', singleRef: targetA },
            profileId
        );

        const fallbackResults = await find_entries_with_relation_to(db, targetA);
        expect(fallbackResults.map((entry) => entry._id)).toContain(sourceEntryId);
    });

    it('ignores non-relation fields when scanning for backlinks', async () => {
        const targetA = await create_entry(db, targetSchemaId, 'ledger:target', { name: 'Target A' }, profileId);

        const sourceEntryId = await create_entry(
            db,
            sourceSchemaId,
            'ledger:source',
            { name: 'Source Entry', ignoredField: targetA },
            profileId
        );

        const fallbackResults = await find_entries_with_relation_to(db, targetA);
        expect(fallbackResults.map((entry) => entry._id)).not.toContain(sourceEntryId);
    });

    it('does not crash when relation target is missing and surfaces warning', async () => {
        const dispatchSpy = vi.spyOn(useErrorStore.getState(), 'dispatchError');

        const sourceEntryId = await create_entry(
            db,
            sourceSchemaId,
            'ledger:source',
            { name: 'Source Entry', singleRef: 'entry:missing-target' },
            profileId
        );

        expect(sourceEntryId).toMatch(/^entry:/);
        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.stringContaining('target entry not found'),
            'warning'
        );
    });
});
