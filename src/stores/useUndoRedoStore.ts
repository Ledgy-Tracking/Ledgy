import { create } from 'zustand';
import { getProfileDb } from '../lib/db';
import { useErrorStore } from './useErrorStore';
import type { LedgyDocument } from '../types/profile';

export type EntryActionType = 'create' | 'update' | 'delete';
export type SchemaActionType = 'deleteSchema' | 'createSchema' | 'updateSchema';
export type ActionType = EntryActionType | SchemaActionType;

export interface UndoRedoMutation {
    previousState: LedgyDocument | null;
    newState: LedgyDocument | null;
}

export interface UndoRedoAction {
    actionId: string;
    actionType: ActionType;
    timestamp: string;
    schemaId: string;
    mutations: UndoRedoMutation[];
}

interface SchemaStacks {
    undo: UndoRedoAction[];
    redo: UndoRedoAction[];
}

interface UndoRedoState {
    activeSchemaId: string | null;
    maxStackSize: number;
    stacks: Record<string, SchemaStacks>;
    setActiveSchemaId: (schemaId: string | null) => void;
    clearAll: () => void;
    clearBySchemaId: (schemaId: string) => void;
    pushUndo: (action: UndoRedoAction) => void;
    undoCount: () => number;
    redoCount: () => number;
    canUndo: () => boolean;
    canRedo: () => boolean;
    undoAction: (activeProfileId: string) => Promise<void>;
    redoAction: (activeProfileId: string) => Promise<void>;
}

const MAX_UNDO_STACK_SIZE = 50;

function ensureSchemaStacks(state: UndoRedoState, schemaId: string): SchemaStacks {
    return state.stacks[schemaId] ?? { undo: [], redo: [] };
}

function trimToMax(actions: UndoRedoAction[]): UndoRedoAction[] {
    if (actions.length <= MAX_UNDO_STACK_SIZE) {
        return actions;
    }
    return actions.slice(actions.length - MAX_UNDO_STACK_SIZE);
}

function actionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `action:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

export function createAction(
    actionType: ActionType,
    schemaId: string,
    mutations: UndoRedoMutation[],
): UndoRedoAction {
    return {
        actionId: actionId(),
        actionType,
        schemaId,
        timestamp: new Date().toISOString(),
        mutations,
    };
}

async function applyMutationsForward(
    activeProfileId: string,
    action: UndoRedoAction,
): Promise<void> {
    const db = getProfileDb(activeProfileId);
    for (const mutation of action.mutations) {
        const nextDoc = mutation.newState;
        if (!nextDoc || typeof nextDoc._id !== 'string') {
            continue;
        }
        await db.updateDocument(nextDoc._id, nextDoc);
    }
}

async function applyMutationsReverse(
    activeProfileId: string,
    action: UndoRedoAction,
): Promise<void> {
    const db = getProfileDb(activeProfileId);
    for (const mutation of action.mutations) {
        const prevDoc = mutation.previousState;
        if (!prevDoc || typeof prevDoc._id !== 'string') {
            continue;
        }
        await db.updateDocument(prevDoc._id, prevDoc);
    }
}

function isPouchConflict(err: unknown): boolean {
    return Boolean(err && typeof err === 'object' && 'status' in err && (err as { status?: number }).status === 409);
}

export const useUndoRedoStore = create<UndoRedoState>((set, get) => ({
    activeSchemaId: null,
    maxStackSize: MAX_UNDO_STACK_SIZE,
    stacks: {},

    setActiveSchemaId: (schemaId) => {
        set({ activeSchemaId: schemaId });
    },

    clearAll: () => {
        set({ stacks: {}, activeSchemaId: null });
    },

    clearBySchemaId: (schemaId) => {
        set((state) => {
            if (!state.stacks[schemaId]) {
                return state;
            }
            const nextStacks = { ...state.stacks };
            delete nextStacks[schemaId];
            return { stacks: nextStacks };
        });
    },

    pushUndo: (action) => {
        set((state) => {
            const current = ensureSchemaStacks(state, action.schemaId);
            const nextUndo = trimToMax([...current.undo, action]);
            const nextStacks = {
                ...state.stacks,
                [action.schemaId]: { undo: nextUndo, redo: [] },
            };
            return { stacks: nextStacks };
        });
    },

    undoCount: () => {
        const state = get();
        if (!state.activeSchemaId) return 0;
        return ensureSchemaStacks(state, state.activeSchemaId).undo.length;
    },

    redoCount: () => {
        const state = get();
        if (!state.activeSchemaId) return 0;
        return ensureSchemaStacks(state, state.activeSchemaId).redo.length;
    },

    canUndo: () => get().undoCount() > 0,
    canRedo: () => get().redoCount() > 0,

    undoAction: async (activeProfileId) => {
        const state = get();
        const schemaId = state.activeSchemaId;
        if (!schemaId) return;
        const stacks = ensureSchemaStacks(state, schemaId);
        const action = stacks.undo[stacks.undo.length - 1];
        if (!action) return;

        try {
            await applyMutationsReverse(activeProfileId, action);
            set((next) => {
                const current = ensureSchemaStacks(next, schemaId);
                return {
                    stacks: {
                        ...next.stacks,
                        [schemaId]: {
                            undo: current.undo.slice(0, -1),
                            redo: trimToMax([...current.redo, action]),
                        },
                    },
                };
            });
        } catch (err) {
            if (isPouchConflict(err)) {
                useErrorStore.getState().dispatchError('Undo failed: entry was modified on another device', 'error');
                return;
            }
            throw err;
        }
    },

    redoAction: async (activeProfileId) => {
        const state = get();
        const schemaId = state.activeSchemaId;
        if (!schemaId) return;
        const stacks = ensureSchemaStacks(state, schemaId);
        const action = stacks.redo[stacks.redo.length - 1];
        if (!action) return;

        try {
            await applyMutationsForward(activeProfileId, action);
            set((next) => {
                const current = ensureSchemaStacks(next, schemaId);
                return {
                    stacks: {
                        ...next.stacks,
                        [schemaId]: {
                            undo: trimToMax([...current.undo, action]),
                            redo: current.redo.slice(0, -1),
                        },
                    },
                };
            });
        } catch (err) {
            if (isPouchConflict(err)) {
                useErrorStore.getState().dispatchError('Undo failed: entry was modified on another device', 'error');
                return;
            }
            throw err;
        }
    },
}));

