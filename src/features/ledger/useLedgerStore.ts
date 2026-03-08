import { create } from 'zustand';
import { getProfileDb } from '../../lib/db';
import {
    list_entries,
    list_schemas,
    create_entry,
    update_entry,
    delete_entry,
    create_schema,
} from '../../lib/db';
import { LedgerEntry } from '../../types/ledger';
import { LedgerSchema, SchemaField as LedgerSchemaField } from '../../types/ledger';
import { useProfileStore } from '../../stores/useProfileStore';
import { useErrorStore } from '../../stores/useErrorStore';

export type { LedgerEntry };
export type Schema = LedgerSchema;

export interface SchemaField {
    name: string;
    type: 'text' | 'number' | 'date' | 'relation' | 'boolean';
    required?: boolean;
    validation?: {
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        min?: number;
        max?: number;
    };
    relation?: {
        targetSchema: string;
        bidirectional?: boolean;
    };
}

interface LedgerState {
    // State fields
    entries: LedgerEntry[];
    schemas: LedgerSchema[];
    isLoading: boolean;
    error: string | null;

    // Actions
    loadEntries: (schemaType?: string) => Promise<void>;
    loadSchemas: () => Promise<void>;
    createEntry: (entry: Partial<LedgerEntry>) => Promise<void>;
    updateEntry: (id: string, updates: Partial<LedgerEntry>) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
    createSchema: (schema: Partial<LedgerSchema>) => Promise<void>;
    // Memory Sweep
    clearProfileData: () => void;
}

function getActiveDb() {
    const activeProfileId = useProfileStore.getState().activeProfileId;
    if (!activeProfileId) {
        useErrorStore.getState().dispatchError('No active profile selected', 'error');
        return null;
    }
    return getProfileDb(activeProfileId);
}

export const useLedgerStore = create<LedgerState>((set, get) => ({
    // Initial state
    entries: [],
    schemas: [],
    isLoading: false,
    error: null,

    loadEntries: async (schemaType?: string) => {
        set({ isLoading: true, error: null });
        try {
            const db = getActiveDb();
            if (!db) {
                set({ isLoading: false });
                return;
            }
            let entries: LedgerEntry[];
            if (schemaType) {
                entries = await list_entries(db, schemaType);
            } else {
                const all = await db.getAllDocuments<LedgerEntry>('entry');
                entries = all.filter(e => !e.isDeleted);
            }
            set({ entries, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load entries';
            set({ error: errorMessage, isLoading: false });
            useErrorStore.getState().dispatchError(errorMessage, 'error');
        }
    },

    loadSchemas: async () => {
        set({ isLoading: true, error: null });
        try {
            const db = getActiveDb();
            if (!db) {
                set({ isLoading: false });
                return;
            }
            const schemas = await list_schemas(db);
            set({ schemas, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load schemas';
            set({ error: errorMessage, isLoading: false });
            useErrorStore.getState().dispatchError(errorMessage, 'error');
        }
    },

    createEntry: async (entry: Partial<LedgerEntry>) => {
        set({ isLoading: true, error: null });
        try {
            const activeProfileId = useProfileStore.getState().activeProfileId;
            if (!activeProfileId) {
                useErrorStore.getState().dispatchError('No active profile selected', 'error');
                set({ isLoading: false });
                return;
            }
            const db = getProfileDb(activeProfileId);
            const schemaId = entry.schemaId || '';
            const ledgerId = entry.ledgerId || schemaId;
            const data = entry.data || {};
            await create_entry(db, schemaId, ledgerId, data, activeProfileId);
            await get().loadEntries(ledgerId);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create entry';
            set({ error: errorMessage, isLoading: false });
            useErrorStore.getState().dispatchError(errorMessage, 'error');
        }
    },

    updateEntry: async (id: string, updates: Partial<LedgerEntry>) => {
        set({ isLoading: true, error: null });
        try {
            const db = getActiveDb();
            if (!db) {
                set({ isLoading: false });
                return;
            }
            await update_entry(db, id, updates.data || (updates as Record<string, unknown>));
            const updatedEntries = get().entries.map(entry =>
                entry._id === id
                    ? { ...entry, ...updates, updatedAt: new Date().toISOString() }
                    : entry
            );
            set({ entries: updatedEntries, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update entry';
            set({ error: errorMessage, isLoading: false });
            useErrorStore.getState().dispatchError(errorMessage, 'error');
        }
    },

    deleteEntry: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            const db = getActiveDb();
            if (!db) {
                set({ isLoading: false });
                return;
            }
            await delete_entry(db, id);
            const updatedEntries = get().entries.map(entry =>
                entry._id === id
                    ? { ...entry, isDeleted: true, deletedAt: new Date().toISOString() }
                    : entry
            );
            set({ entries: updatedEntries, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete entry';
            set({ error: errorMessage, isLoading: false });
            useErrorStore.getState().dispatchError(errorMessage, 'error');
        }
    },

    createSchema: async (schema: Partial<LedgerSchema>) => {
        set({ isLoading: true, error: null });
        try {
            const activeProfileId = useProfileStore.getState().activeProfileId;
            if (!activeProfileId) {
                useErrorStore.getState().dispatchError('No active profile selected', 'error');
                set({ isLoading: false });
                return;
            }
            const db = getProfileDb(activeProfileId);
            await create_schema(
                db,
                schema.name || 'Unnamed Schema',
                (schema.fields || []) as LedgerSchemaField[],
                activeProfileId,
                schema.projectId || '',
            );
            await get().loadSchemas();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create schema';
            set({ error: errorMessage, isLoading: false });
            useErrorStore.getState().dispatchError(errorMessage, 'error');
        }
    },

    clearProfileData: () => {
        set({
            entries: [],
            schemas: [],
            isLoading: false,
            error: null,
        });
    },
}));
