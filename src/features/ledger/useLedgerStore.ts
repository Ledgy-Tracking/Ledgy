import { create } from 'zustand';

export interface LedgerEntry {
    _id: string;
    type: string;
    schema_version: number;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    isDeleted?: boolean;
    [key: string]: unknown;
}

export interface Schema {
    _id: string;
    type: string;
    schema_version: number;
    name: string;
    fields: SchemaField[];
    createdAt: string;
    updatedAt: string;
}

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
    schemas: Schema[];
    isLoading: boolean;
    error: string | null;

    // Actions
    loadEntries: (schemaType?: string) => Promise<void>;
    loadSchemas: () => Promise<void>;
    createEntry: (entry: Partial<LedgerEntry>) => Promise<void>;
    updateEntry: (id: string, updates: Partial<LedgerEntry>) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
    createSchema: (schema: Partial<Schema>) => Promise<void>;
    // Memory Sweep
    clearProfileData: () => void;
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
            // TODO: Implement PouchDB integration in Story 1.5
            // For now, mock implementation
            const stored = localStorage.getItem('ledgy-entries');
            const entries: LedgerEntry[] = stored ? JSON.parse(stored) : [];

            const filtered = schemaType
                ? entries.filter(e => e.type === schemaType)
                : entries;

            set({ entries: filtered, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load entries';
            set({ error: errorMessage, isLoading: false });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    loadSchemas: async () => {
        set({ isLoading: true, error: null });
        try {
            // TODO: Implement PouchDB integration in Story 1.5
            // For now, mock implementation
            const stored = localStorage.getItem('ledgy-schemas');
            const schemas: Schema[] = stored ? JSON.parse(stored) : [];
            set({ schemas, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load schemas';
            set({ error: errorMessage, isLoading: false });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    createEntry: async (entry: Partial<LedgerEntry>) => {
        set({ isLoading: true, error: null });
        try {
            // TODO: Implement PouchDB integration in Story 1.5
            // For now, mock implementation
            const newEntry: LedgerEntry = {
                _id: `entry:${Date.now()}`,
                type: entry.type || 'unknown',
                schema_version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ...entry,
            } as LedgerEntry;

            const updatedEntries = [...get().entries, newEntry];
            localStorage.setItem('ledgy-entries', JSON.stringify(updatedEntries));
            set({ entries: updatedEntries, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create entry';
            set({ error: errorMessage, isLoading: false });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    updateEntry: async (id: string, updates: Partial<LedgerEntry>) => {
        set({ isLoading: true, error: null });
        try {
            // TODO: Implement PouchDB integration in Story 1.5
            const updatedEntries = get().entries.map(entry =>
                entry._id === id
                    ? { ...entry, ...updates, updatedAt: new Date().toISOString() }
                    : entry
            );
            localStorage.setItem('ledgy-entries', JSON.stringify(updatedEntries));
            set({ entries: updatedEntries, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update entry';
            set({ error: errorMessage, isLoading: false });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    deleteEntry: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            // TODO: Implement PouchDB integration in Story 1.5
            // Ghost reference pattern - soft delete
            const updatedEntries = get().entries.map(entry =>
                entry._id === id
                    ? { ...entry, isDeleted: true, deletedAt: new Date().toISOString() }
                    : entry
            );
            localStorage.setItem('ledgy-entries', JSON.stringify(updatedEntries));
            set({ entries: updatedEntries, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete entry';
            set({ error: errorMessage, isLoading: false });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    createSchema: async (schema: Partial<Schema>) => {
        set({ isLoading: true, error: null });
        try {
            // TODO: Implement PouchDB integration in Story 1.5
            const newSchema: Schema = {
                _id: `schema:${Date.now()}`,
                type: 'schema',
                schema_version: 1,
                name: schema.name || 'Unnamed Schema',
                fields: schema.fields || [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ...schema,
            };

            const updatedSchemas = [...get().schemas, newSchema];
            localStorage.setItem('ledgy-schemas', JSON.stringify(updatedSchemas));
            set({ schemas: updatedSchemas, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create schema';
            set({ error: errorMessage, isLoading: false });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
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
