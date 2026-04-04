import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAction, useUndoRedoStore } from '../src/stores/useUndoRedoStore';
import { useErrorStore } from '../src/stores/useErrorStore';

const mockUpdateDocument = vi.fn();

vi.mock('../src/lib/db', () => ({
    getProfileDb: vi.fn(() => ({
        updateDocument: mockUpdateDocument,
    })),
}));

const PROFILE_ID = 'profile:test';
const SCHEMA_ID = 'schema:a';

describe('useUndoRedoStore', () => {
    beforeEach(() => {
        useUndoRedoStore.getState().clearAll();
        useUndoRedoStore.getState().setActiveSchemaId(SCHEMA_ID);
        useErrorStore.getState().clearError();
        vi.clearAllMocks();
        mockUpdateDocument.mockResolvedValue(undefined);
    });

    // ── Stack cap & redo clearing ────────────────────────────────────────────

    it('pushUndo caps stack at 50 and clears redo', () => {
        const store = useUndoRedoStore.getState();
        for (let i = 0; i < 55; i += 1) {
            store.pushUndo(createAction('update', SCHEMA_ID, [{ previousState: { _id: `entry:${i}` }, newState: { _id: `entry:${i}` } }]));
        }

        expect(store.undoCount()).toBe(50);
        expect(store.redoCount()).toBe(0);
    });

    it('pushUndo clears the redo stack', async () => {
        const store = useUndoRedoStore.getState();
        const action = createAction('update', SCHEMA_ID, [
            { previousState: { _id: 'entry:1', name: 'old' }, newState: { _id: 'entry:1', name: 'new' } },
        ]);
        store.pushUndo(action);
        await store.undoAction(PROFILE_ID);
        expect(store.redoCount()).toBe(1);

        // New action clears redo
        store.pushUndo(createAction('create', SCHEMA_ID, [{ previousState: null, newState: { _id: 'entry:2' } }]));
        expect(store.redoCount()).toBe(0);
    });

    // ── Empty stack graceful handling ────────────────────────────────────────

    it('undoAction on empty stack is a no-op', async () => {
        const store = useUndoRedoStore.getState();
        expect(store.undoCount()).toBe(0);
        await expect(store.undoAction(PROFILE_ID)).resolves.toBeUndefined();
        expect(mockUpdateDocument).not.toHaveBeenCalled();
    });

    it('redoAction on empty stack is a no-op', async () => {
        const store = useUndoRedoStore.getState();
        expect(store.redoCount()).toBe(0);
        await expect(store.redoAction(PROFILE_ID)).resolves.toBeUndefined();
        expect(mockUpdateDocument).not.toHaveBeenCalled();
    });

    // ── Per-schema isolation ─────────────────────────────────────────────────

    it('counts are isolated by schema', () => {
        const store = useUndoRedoStore.getState();
        store.pushUndo(createAction('create', SCHEMA_ID, [{ previousState: null, newState: { _id: 'entry:1' } }]));
        store.pushUndo(createAction('create', 'schema:b', [{ previousState: null, newState: { _id: 'entry:2' } }]));

        store.setActiveSchemaId(SCHEMA_ID);
        expect(store.undoCount()).toBe(1);
        store.setActiveSchemaId('schema:b');
        expect(store.undoCount()).toBe(1);
    });

    it('switching ledger does not lose the previous ledger stack', () => {
        const store = useUndoRedoStore.getState();
        store.pushUndo(createAction('update', SCHEMA_ID, [{ previousState: { _id: 'entry:1' }, newState: { _id: 'entry:1' } }]));

        store.setActiveSchemaId('schema:b');
        expect(store.undoCount()).toBe(0);

        store.setActiveSchemaId(SCHEMA_ID);
        expect(store.undoCount()).toBe(1);
    });

    // ── Action type: create ──────────────────────────────────────────────────

    it('undoAction for create calls updateDocument with isDeleted:true', async () => {
        const store = useUndoRedoStore.getState();
        store.pushUndo(createAction('create', SCHEMA_ID, [
            { previousState: null, newState: { _id: 'entry:1' } },
        ]));

        await store.undoAction(PROFILE_ID);

        expect(mockUpdateDocument).toHaveBeenCalledWith('entry:1', { isDeleted: true });
        expect(store.undoCount()).toBe(0);
        expect(store.redoCount()).toBe(1);
    });

    // ── Action type: update ──────────────────────────────────────────────────

    it('undoAction for update restores previousState', async () => {
        const store = useUndoRedoStore.getState();
        const prevDoc = { _id: 'entry:1', name: 'Old Name' };
        const newDoc = { _id: 'entry:1', name: 'New Name' };
        store.pushUndo(createAction('update', SCHEMA_ID, [{ previousState: prevDoc, newState: newDoc }]));

        await store.undoAction(PROFILE_ID);

        expect(mockUpdateDocument).toHaveBeenCalledWith('entry:1', prevDoc);
        expect(store.undoCount()).toBe(0);
        expect(store.redoCount()).toBe(1);
    });

    it('redoAction for update re-applies newState', async () => {
        const store = useUndoRedoStore.getState();
        const prevDoc = { _id: 'entry:1', name: 'Old Name' };
        const newDoc = { _id: 'entry:1', name: 'New Name' };
        store.pushUndo(createAction('update', SCHEMA_ID, [{ previousState: prevDoc, newState: newDoc }]));
        await store.undoAction(PROFILE_ID);
        vi.clearAllMocks();

        await store.redoAction(PROFILE_ID);

        expect(mockUpdateDocument).toHaveBeenCalledWith('entry:1', newDoc);
        expect(store.undoCount()).toBe(1);
        expect(store.redoCount()).toBe(0);
    });

    // ── Action type: delete ──────────────────────────────────────────────────

    it('undoAction for delete restores entry (isDeleted:false)', async () => {
        const store = useUndoRedoStore.getState();
        const liveEntry = { _id: 'entry:1', isDeleted: false };
        const deletedEntry = { _id: 'entry:1', isDeleted: true };
        store.pushUndo(createAction('delete', SCHEMA_ID, [{ previousState: liveEntry, newState: deletedEntry }]));

        await store.undoAction(PROFILE_ID);

        expect(mockUpdateDocument).toHaveBeenCalledWith('entry:1', liveEntry);
    });

    // ── Conflict handling (AC 12) ────────────────────────────────────────────

    it('undoAction on PouchDB conflict dispatches error and keeps action in stack', async () => {
        const conflict = Object.assign(new Error('conflict'), { status: 409 });
        mockUpdateDocument.mockRejectedValueOnce(conflict);

        const store = useUndoRedoStore.getState();
        store.pushUndo(createAction('update', SCHEMA_ID, [
            { previousState: { _id: 'entry:1' }, newState: { _id: 'entry:1' } },
        ]));

        await store.undoAction(PROFILE_ID);

        expect(useErrorStore.getState().error?.message).toBe('Undo failed: entry was modified on another device');
        expect(store.undoCount()).toBe(1); // action preserved for retry
        expect(store.redoCount()).toBe(0);
    });

    it('redoAction on PouchDB conflict dispatches redo-specific error and keeps action in stack', async () => {
        const conflict = Object.assign(new Error('conflict'), { status: 409 });

        const store = useUndoRedoStore.getState();
        const action = createAction('update', SCHEMA_ID, [
            { previousState: { _id: 'entry:1' }, newState: { _id: 'entry:1' } },
        ]);
        store.pushUndo(action);
        await store.undoAction(PROFILE_ID); // move to redo
        vi.clearAllMocks();
        mockUpdateDocument.mockRejectedValueOnce(conflict);

        await store.redoAction(PROFILE_ID);

        expect(useErrorStore.getState().error?.message).toBe('Redo failed: entry was modified on another device');
        expect(store.redoCount()).toBe(1); // action preserved for retry
        expect(store.undoCount()).toBe(0);
    });
});
