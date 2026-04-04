/**
 * Integration tests for undo/redo flows (Story 3.15).
 *
 * Tests the full action capture → undo → redo cycle using a real in-memory
 * PouchDB instance. Each test gets a unique profile ID so getProfileDb's
 * module-level cache never returns a destroyed instance.
 *
 * Covers: AC 1, 3, 4, 5, 9, 12.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Database, create_entry, create_schema, list_all_entries } from '../src/lib/db';
import { createAction, useUndoRedoStore } from '../src/stores/useUndoRedoStore';
import { useErrorStore } from '../src/stores/useErrorStore';

// Unique profile ID per test prevents getProfileDb cache from returning a
// destroyed instance across tests.
let testCounter = 0;
let profileId: string;
let db: Database;
let schemaId: string;
let ledgerId: string;

beforeEach(async () => {
    profileId = `profile:undo-redo-integration-${++testCounter}`;
    db = new Database(profileId);
    schemaId = await create_schema(db, 'Test Schema', [{ name: 'name', type: 'text' }], profileId, 'project:test');
    ledgerId = `ledger:${schemaId}`;
    useUndoRedoStore.getState().clearAll();
    useUndoRedoStore.getState().setActiveSchemaId(schemaId);
    useErrorStore.getState().clearError();
});

afterEach(async () => {
    await db.destroy();
});

// Helper: get all entries including deleted
async function getAllEntries() {
    return list_all_entries(db, ledgerId);
}

// ── Undo of create: entry soft-deleted (AC 4) ────────────────────────────────

describe('create → undo', () => {
    it('soft-deletes the created entry and moves action to redo stack (AC 4)', async () => {
        const entryId = await create_entry(db, schemaId, ledgerId, { name: 'Alpha' }, profileId);
        const created = await db.getDocument<any>(entryId);

        useUndoRedoStore.getState().pushUndo(
            createAction('create', schemaId, [{ previousState: null, newState: created }])
        );
        expect(useUndoRedoStore.getState().undoCount()).toBe(1);

        await useUndoRedoStore.getState().undoAction(profileId);

        // undoAction writes to getProfileDb(profileId) — same in-memory PouchDB as db
        // Re-read via db to verify the write
        const afterUndo = await db.getDocument<any>(entryId);
        expect(afterUndo.isDeleted).toBe(true);
        expect(useUndoRedoStore.getState().undoCount()).toBe(0);
        expect(useUndoRedoStore.getState().redoCount()).toBe(1);
    });

    it('redo of undone create restores entry (AC 5)', async () => {
        const entryId = await create_entry(db, schemaId, ledgerId, { name: 'Beta' }, profileId);
        const created = await db.getDocument<any>(entryId);

        useUndoRedoStore.getState().pushUndo(
            createAction('create', schemaId, [{ previousState: null, newState: created }])
        );

        await useUndoRedoStore.getState().undoAction(profileId);
        expect((await db.getDocument<any>(entryId)).isDeleted).toBe(true);

        await useUndoRedoStore.getState().redoAction(profileId);
        expect((await db.getDocument<any>(entryId)).isDeleted).toBe(false);
        expect(useUndoRedoStore.getState().undoCount()).toBe(1);
        expect(useUndoRedoStore.getState().redoCount()).toBe(0);
    });
});

// ── Undo of delete: entry restored (AC 4, AC 5) ──────────────────────────────

describe('delete → undo → redo', () => {
    it('restores a soft-deleted entry on undo, then re-deletes on redo (AC 4/5)', async () => {
        const entryId = await create_entry(db, schemaId, ledgerId, { name: 'Gamma' }, profileId);
        const liveEntry = await db.getDocument<any>(entryId);

        // Soft-delete directly
        await db.updateDocument(entryId, { isDeleted: true });
        const deletedEntry = await db.getDocument<any>(entryId);

        useUndoRedoStore.getState().pushUndo(
            createAction('delete', schemaId, [{ previousState: liveEntry, newState: deletedEntry }])
        );

        // Undo delete → restored
        await useUndoRedoStore.getState().undoAction(profileId);
        expect((await db.getDocument<any>(entryId)).isDeleted).toBe(false);
        expect(useUndoRedoStore.getState().redoCount()).toBe(1);

        // Redo delete → soft-deleted again
        await useUndoRedoStore.getState().redoAction(profileId);
        expect((await db.getDocument<any>(entryId)).isDeleted).toBe(true);
        expect(useUndoRedoStore.getState().undoCount()).toBe(1);
        expect(useUndoRedoStore.getState().redoCount()).toBe(0);
    });
});

// ── Undo + Redo + Undo determinism ───────────────────────────────────────────

describe('undo → redo → undo determinism', () => {
    it('triple-cycle produces the correct state each time', async () => {
        const entryId = await create_entry(db, schemaId, ledgerId, { name: 'Delta' }, profileId);
        const created = await db.getDocument<any>(entryId);

        useUndoRedoStore.getState().pushUndo(
            createAction('create', schemaId, [{ previousState: null, newState: created }])
        );

        await useUndoRedoStore.getState().undoAction(profileId);
        expect((await db.getDocument<any>(entryId)).isDeleted).toBe(true);

        await useUndoRedoStore.getState().redoAction(profileId);
        expect((await db.getDocument<any>(entryId)).isDeleted).toBe(false);

        await useUndoRedoStore.getState().undoAction(profileId);
        expect((await db.getDocument<any>(entryId)).isDeleted).toBe(true);
    });
});

// ── Cross-ledger stack isolation (AC 9) ──────────────────────────────────────

describe('cross-ledger stack isolation (AC 9)', () => {
    it('stacks are isolated per schema and both survive ledger switching', async () => {
        const schemaId2 = await create_schema(db, 'Schema 2', [{ name: 'val', type: 'text' }], profileId, 'project:test');
        const store = useUndoRedoStore.getState();

        store.setActiveSchemaId(schemaId);
        store.pushUndo(createAction('update', schemaId, [{ previousState: { _id: 'entry:a' }, newState: { _id: 'entry:a' } }]));

        store.setActiveSchemaId(schemaId2);
        store.pushUndo(createAction('update', schemaId2, [{ previousState: { _id: 'entry:b' }, newState: { _id: 'entry:b' } }]));
        store.pushUndo(createAction('update', schemaId2, [{ previousState: { _id: 'entry:c' }, newState: { _id: 'entry:c' } }]));

        store.setActiveSchemaId(schemaId);
        expect(store.undoCount()).toBe(1);

        store.setActiveSchemaId(schemaId2);
        expect(store.undoCount()).toBe(2);

        // Switching back resumes old stack (AC 9)
        store.setActiveSchemaId(schemaId);
        expect(store.undoCount()).toBe(1);
    });
});

// ── FIFO eviction at 50-action limit (AC 3) ──────────────────────────────────

describe('50-action FIFO eviction (AC 3)', () => {
    it('evicts oldest action when 51st is pushed', () => {
        const store = useUndoRedoStore.getState();
        for (let i = 0; i < 51; i++) {
            store.pushUndo(createAction('update', schemaId, [
                { previousState: { _id: `entry:${i}` }, newState: { _id: `entry:${i}` } },
            ]));
        }
        expect(store.undoCount()).toBe(50);
        const stacks = useUndoRedoStore.getState().stacks[schemaId];
        // Oldest (entry:0) evicted; entry:1 is now the first
        expect(stacks.undo[0].mutations[0].newState?._id).toBe('entry:1');
    });
});

// ── Profile switch clears all stacks (AC 1) ──────────────────────────────────

describe('profile switch clears stacks (AC 1)', () => {
    it('clearAll resets stacks and activeSchemaId', () => {
        const store = useUndoRedoStore.getState();
        store.pushUndo(createAction('update', schemaId, [{ previousState: { _id: 'entry:x' }, newState: { _id: 'entry:x' } }]));
        expect(store.undoCount()).toBe(1);

        store.clearAll();

        // Read fresh state — getState() snapshot is stale after clearAll
        const fresh = useUndoRedoStore.getState();
        expect(fresh.undoCount()).toBe(0);
        expect(fresh.activeSchemaId).toBeNull();
    });
});

// ── Undo visibility via list_all_entries ─────────────────────────────────────

describe('undo visibility in entry list', () => {
    it('undoing create makes entry appear as isDeleted:true in list', async () => {
        const entryId = await create_entry(db, schemaId, ledgerId, { name: 'Epsilon' }, profileId);
        const created = await db.getDocument<any>(entryId);

        useUndoRedoStore.getState().pushUndo(
            createAction('create', schemaId, [{ previousState: null, newState: created }])
        );

        const before = await getAllEntries();
        expect(before.some((e) => e._id === entryId && !e.isDeleted)).toBe(true);

        await useUndoRedoStore.getState().undoAction(profileId);

        const after = await getAllEntries();
        const entry = after.find((e) => e._id === entryId);
        expect(entry?.isDeleted).toBe(true);
    });
});

// ── Bundled action (backlink atomicity, AC 11) ───────────────────────────────

describe('bundled action (AC 11)', () => {
    it('undoes multiple mutations in a single action atomically', async () => {
        const entryId1 = await create_entry(db, schemaId, ledgerId, { name: 'E1' }, profileId);
        const entryId2 = await create_entry(db, schemaId, ledgerId, { name: 'E2' }, profileId);
        const doc1 = await db.getDocument<any>(entryId1);
        const doc2 = await db.getDocument<any>(entryId2);

        // A bundle of two mutations (e.g. entry + backlink patch)
        useUndoRedoStore.getState().pushUndo(
            createAction('create', schemaId, [
                { previousState: null, newState: doc1 },
                { previousState: null, newState: doc2 },
            ])
        );

        await useUndoRedoStore.getState().undoAction(profileId);

        expect((await db.getDocument<any>(entryId1)).isDeleted).toBe(true);
        expect((await db.getDocument<any>(entryId2)).isDeleted).toBe(true);
        expect(useUndoRedoStore.getState().undoCount()).toBe(0);
        expect(useUndoRedoStore.getState().redoCount()).toBe(1);
    });
});
