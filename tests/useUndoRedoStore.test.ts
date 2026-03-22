import { beforeEach, describe, expect, it } from 'vitest';
import { createAction, useUndoRedoStore } from '../src/stores/useUndoRedoStore';

describe('useUndoRedoStore', () => {
    beforeEach(() => {
        useUndoRedoStore.getState().clearAll();
        useUndoRedoStore.getState().setActiveSchemaId('schema:a');
    });

    it('pushUndo caps stack at 50 and clears redo', () => {
        const store = useUndoRedoStore.getState();
        for (let i = 0; i < 55; i += 1) {
            store.pushUndo(createAction('update', 'schema:a', [{ previousState: { _id: `entry:${i}` }, newState: { _id: `entry:${i}` } }]));
        }

        expect(store.undoCount()).toBe(50);
        expect(store.redoCount()).toBe(0);
    });

    it('counts are isolated by schema', () => {
        const store = useUndoRedoStore.getState();
        store.pushUndo(createAction('create', 'schema:a', [{ previousState: null, newState: { _id: 'entry:1' } }]));
        store.pushUndo(createAction('create', 'schema:b', [{ previousState: null, newState: { _id: 'entry:2' } }]));

        store.setActiveSchemaId('schema:a');
        expect(store.undoCount()).toBe(1);
        store.setActiveSchemaId('schema:b');
        expect(store.undoCount()).toBe(1);
    });
});

