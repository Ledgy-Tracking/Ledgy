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
    list_all_entries,
    delete_entry,
    restore_entry,
    find_entries_with_relation_to,
} from '../lib/db';

interface LedgerState {
    schemas: LedgerSchema[];
    entries: Record<string, LedgerEntry[]>; // keyed by ledgerId (excluding deleted)
    allEntries: Record<string, LedgerEntry[]>; // keyed by ledgerId (including deleted)
    backLinks: Record<string, LedgerEntry[]>; // keyed by targetEntryId
    isLoading: boolean;
    error: string | null;
    onEntryEvent?: (eventType: 'on-create' | 'on-edit', entry: LedgerEntry) => void;

    // Actions
    fetchSchemas: (profileId: string) => Promise<void>;
    createSchema: (profileId: string, name: string, fields: SchemaField[]) => Promise<string>;
    updateSchema: (schemaId: string, name: string, fields: SchemaField[]) => Promise<void>;
    fetchEntries: (profileId: string, ledgerId: string) => Promise<void>;
    fetchBackLinks: (profileId: string, targetEntryId: string) => Promise<void>;
    createEntry: (profileId: string, schemaId: string, ledgerId: string, data: Record<string, unknown>) => Promise<string>;
    updateEntry: (entryId: string, data: Record<string, unknown>) => Promise<void>;
    deleteEntry: (entryId: string) => Promise<void>;
    restoreEntry: (entryId: string) => Promise<void>;
    setOnEntryEvent: (callback: (eventType: 'on-create' | 'on-edit', entry: LedgerEntry) => void) => void;
}

export const useLedgerStore = create<LedgerState>((set, get) => ({
    schemas: [],
    entries: {},
    allEntries: {},
    backLinks: {},
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
            const allEntries = await list_all_entries(db, ledgerId);
            set({
                entries: { ...get().entries, [ledgerId]: entries },
                allEntries: { ...get().allEntries, [ledgerId]: allEntries },
                isLoading: false
            });
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to fetch entries';
            set({ error: errorMsg, isLoading: false });
            useErrorStore.getState().dispatchError(errorMsg);
        }
    },

    fetchBackLinks: async (profileId: string, targetEntryId: string) => {
        set({ isLoading: true, error: null });
        try {
            const authState = useAuthStore.getState();
            if (!authState.isUnlocked) {
                throw new Error('Vault must be unlocked to fetch back-links.');
            }

            const db = getProfileDb(profileId);
            const backLinks = await find_entries_with_relation_to(db, targetEntryId);
            set({
                backLinks: { ...get().backLinks, [targetEntryId]: backLinks },
                isLoading: false
            });
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to fetch back-links';
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
            
            // Fire on-create trigger event
            const state = get();
            if (state.onEntryEvent) {
                const entry = await db.getDocument<any>(entryId);
                state.onEntryEvent('on-create', entry);
            }
            
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

            // Fire on-edit trigger event
            const ledgerState = get();
            if (ledgerState.onEntryEvent) {
                const entry = await db.getDocument<any>(entryId);
                ledgerState.onEntryEvent('on-edit', entry);
            }

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

    restoreEntry: async (entryId: string) => {
        set({ isLoading: true, error: null });
        try {
            const state = useProfileStore.getState();
            if (!state.activeProfileId) {
                throw new Error('No active profile selected');
            }

            const db = getProfileDb(state.activeProfileId);
            const entry = await db.getDocument<any>(entryId);
            await restore_entry(db, entryId);

            // Refresh entries for the ledger
            await get().fetchEntries(state.activeProfileId, entry.ledgerId);
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to restore entry';
            set({ error: errorMsg, isLoading: false });
            useErrorStore.getState().dispatchError(errorMsg);
            throw err;
        }
    },

    setOnEntryEvent: (callback: (eventType: 'on-create' | 'on-edit', entry: LedgerEntry) => void) => {
        set({ onEntryEvent: callback });
    },
}));

// Import needed for updateSchema
import { useProfileStore } from './useProfileStore';
