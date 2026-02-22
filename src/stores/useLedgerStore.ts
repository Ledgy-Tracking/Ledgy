import { create } from 'zustand';
import { getProfileDb } from '../lib/db';
import { useErrorStore } from './useErrorStore';
import { useAuthStore } from '../features/auth/useAuthStore';
import { LedgerSchema, SchemaField, LedgerEntry } from '../types/ledger';
import {
    create_schema,
    update_schema,
    list_schemas,
    get_schema,
    create_entry,
    update_entry,
    list_entries,
    delete_entry,
} from '../lib/db';

interface LedgerState {
    schemas: LedgerSchema[];
    entries: Record<string, LedgerEntry[]>; // keyed by ledgerId
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchSchemas: (profileId: string) => Promise<void>;
    createSchema: (profileId: string, name: string, fields: SchemaField[]) => Promise<string>;
    updateSchema: (schemaId: string, name: string, fields: SchemaField[]) => Promise<void>;
    fetchEntries: (profileId: string, ledgerId: string) => Promise<void>;
    createEntry: (profileId: string, schemaId: string, ledgerId: string, data: Record<string, unknown>) => Promise<string>;
    updateEntry: (entryId: string, data: Record<string, unknown>) => Promise<void>;
    deleteEntry: (entryId: string) => Promise<void>;
}

export const useLedgerStore = create<LedgerState>((set, get) => ({
    schemas: [],
    entries: {},
    isLoading: false,
    error: null,

    fetchSchemas: async (profileId: string) => {
        set({ isLoading: true, error: null });
        try {
            const authState = useAuthStore.getState();
            if (!authState.isUnlocked) {
                throw new Error('Vault must be unlocked to fetch schemas.');
            }

            const db = getProfileDb(profileId);
            const schemas = await list_schemas(db);
            set({ schemas, isLoading: false });
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to fetch schemas';
            set({ error: errorMsg, isLoading: false });
            useErrorStore.getState().dispatchError(errorMsg);
        }
    },

    createSchema: async (profileId: string, name: string, fields: SchemaField[]) => {
        set({ isLoading: true, error: null });
        try {
            const authState = useAuthStore.getState();
            if (!authState.isUnlocked) {
                throw new Error('Vault must be unlocked to create a schema.');
            }

            const db = getProfileDb(profileId);
            const schemaId = await create_schema(db, name, fields, profileId);
            await get().fetchSchemas(profileId);
            return schemaId;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to create schema';
            set({ error: errorMsg, isLoading: false });
            useErrorStore.getState().dispatchError(errorMsg);
            throw err;
        }
    },

    updateSchema: async (schemaId: string, name: string, fields: SchemaField[]) => {
        set({ isLoading: true, error: null });
        try {
            // Extract profileId from schemaId format: schema:{uuid}
            // We need to get the schema first to know which profile DB to use
            // For now, assume active profile
            const state = useProfileStore.getState();
            if (!state.activeProfileId) {
                throw new Error('No active profile selected');
            }

            const db = getProfileDb(state.activeProfileId);
            await update_schema(db, schemaId, name, fields);
            await get().fetchSchemas(state.activeProfileId);
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to update schema';
            set({ error: errorMsg, isLoading: false });
            useErrorStore.getState().dispatchError(errorMsg);
            throw err;
        }
    },

    fetchEntries: async (profileId: string, ledgerId: string) => {
        set({ isLoading: true, error: null });
        try {
            const authState = useAuthStore.getState();
            if (!authState.isUnlocked) {
                throw new Error('Vault must be unlocked to fetch entries.');
            }

            const db = getProfileDb(profileId);
            const entries = await list_entries(db, ledgerId);
            set({ 
                entries: { ...get().entries, [ledgerId]: entries },
                isLoading: false 
            });
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to fetch entries';
            set({ error: errorMsg, isLoading: false });
            useErrorStore.getState().dispatchError(errorMsg);
        }
    },

    createEntry: async (profileId: string, schemaId: string, ledgerId: string, data: Record<string, unknown>) => {
        set({ isLoading: true, error: null });
        try {
            const authState = useAuthStore.getState();
            if (!authState.isUnlocked) {
                throw new Error('Vault must be unlocked to create an entry.');
            }

            const db = getProfileDb(profileId);
            const entryId = await create_entry(db, schemaId, ledgerId, data, profileId);
            await get().fetchEntries(profileId, ledgerId);
            return entryId;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to create entry';
            set({ error: errorMsg, isLoading: false });
            useErrorStore.getState().dispatchError(errorMsg);
            throw err;
        }
    },

    updateEntry: async (entryId: string, data: Record<string, unknown>) => {
        set({ isLoading: true, error: null });
        try {
            const state = useProfileStore.getState();
            if (!state.activeProfileId) {
                throw new Error('No active profile selected');
            }

            const db = getProfileDb(state.activeProfileId);
            await update_entry(db, entryId, data);
            
            // Refresh entries for the ledger
            const schema = await get_schema(db, (await db.getDocument<any>(entryId)).schemaId);
            await get().fetchEntries(state.activeProfileId, schema.ledgerId);
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to update entry';
            set({ error: errorMsg, isLoading: false });
            useErrorStore.getState().dispatchError(errorMsg);
            throw err;
        }
    },

    deleteEntry: async (entryId: string) => {
        set({ isLoading: true, error: null });
        try {
            const state = useProfileStore.getState();
            if (!state.activeProfileId) {
                throw new Error('No active profile selected');
            }

            const db = getProfileDb(state.activeProfileId);
            const entry = await db.getDocument<any>(entryId);
            await delete_entry(db, entryId);
            
            // Refresh entries for the ledger
            await get().fetchEntries(state.activeProfileId, entry.ledgerId);
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to delete entry';
            set({ error: errorMsg, isLoading: false });
            useErrorStore.getState().dispatchError(errorMsg);
            throw err;
        }
    },
}));

// Import needed for updateSchema
import { useProfileStore } from './useProfileStore';
