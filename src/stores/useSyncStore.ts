import { create } from 'zustand';
import { getProfileDb } from '../lib/db';
import { useErrorStore } from './useErrorStore';
import { useAuthStore } from '../features/auth/useAuthStore';
import { SyncConfig, SyncStatus } from '../types/sync';
import { ConflictEntry } from '../features/sync/ConflictListSheet';

interface SyncState {
    syncConfig: SyncConfig | null;
    syncStatus: SyncStatus;
    conflicts: ConflictEntry[];
    isLoading: boolean;
    error: string | null;

    // Actions
    loadSyncConfig: (profileId: string) => Promise<void>;
    saveSyncConfig: (profileId: string, config: Partial<SyncConfig>) => Promise<void>;
    triggerSync: (profileId: string) => Promise<void>;
    updateSyncStatus: (status: Partial<SyncStatus>) => void;
    setConflictCount: (count: number) => void;
    addConflict: (conflict: ConflictEntry) => void;
    removeConflict: (entryId: string) => void;
    clearConflicts: () => void;
    getConflicts: () => ConflictEntry[];
}

export const useSyncStore = create<SyncState>((set, get) => ({
    syncConfig: null,
    syncStatus: { status: 'idle' },
    conflicts: [],
    isLoading: false,
    error: null,

    addConflict: (conflict: ConflictEntry) => {
        const current = get().conflicts;
        // Avoid duplicates
        if (!current.some(c => c.entryId === conflict.entryId)) {
            set({ conflicts: [...current, conflict] });
            // Update sync status to conflict
            set({
                syncStatus: {
                    ...get().syncStatus,
                    status: 'conflict',
                    conflictCount: current.length + 1,
                },
            });
        }
    },

    removeConflict: (entryId: string) => {
        const current = get().conflicts;
        const remaining = current.filter(c => c.entryId !== entryId);
        set({ conflicts: remaining });
        
        // Update sync status
        if (remaining.length === 0) {
            set({
                syncStatus: {
                    ...get().syncStatus,
                    status: 'synced',
                    conflictCount: 0,
                },
            });
        } else {
            set({
                syncStatus: {
                    ...get().syncStatus,
                    conflictCount: remaining.length,
                },
            });
        }
    },

    clearConflicts: () => {
        set({ conflicts: [] });
        set({
            syncStatus: {
                ...get().syncStatus,
                status: 'synced',
                conflictCount: 0,
            },
        });
    },

    getConflicts: () => {
        return get().conflicts;
    },

    updateSyncStatus: (status: Partial<SyncStatus>) => {
        set({
            syncStatus: { ...get().syncStatus, ...status },
        });
    },

    setConflictCount: (count: number) => {
        const current = get().syncStatus;
        set({
            syncStatus: {
                ...current,
                conflictCount: count,
                status: count > 0 ? 'conflict' : current.status === 'conflict' ? 'pending' : current.status,
            },
        });
    },

    loadSyncConfig: async (profileId: string) => {
        set({ isLoading: true, error: null });
        try {
            const authState = useAuthStore.getState();
            if (!authState.isUnlocked) {
                throw new Error('Vault must be unlocked to load sync config.');
            }

            const db = getProfileDb(profileId);
            // TODO: Implement get_sync_config in db.ts
            set({ isLoading: false });
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to load sync config';
            set({ error: errorMsg, isLoading: false });
            useErrorStore.getState().dispatchError(errorMsg);
        }
    },

    saveSyncConfig: async (profileId: string, config: Partial<SyncConfig>) => {
        set({ isLoading: true, error: null });
        try {
            const authState = useAuthStore.getState();
            if (!authState.isUnlocked) {
                throw new Error('Vault must be unlocked to save sync config.');
            }

            const db = getProfileDb(profileId);
            // TODO: Implement save_sync_config in db.ts with encryption
            set({ isLoading: false });
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to save sync config';
            set({ error: errorMsg, isLoading: false });
            useErrorStore.getState().dispatchError(errorMsg);
        }
    },

    triggerSync: async (profileId: string) => {
        set({ isLoading: true, error: null });
        try {
            const authState = useAuthStore.getState();
            if (!authState.isUnlocked) {
                throw new Error('Vault must be unlocked to trigger sync.');
            }

            // TODO: Implement PouchDB replication in db.ts
            set({ 
                syncStatus: { ...get().syncStatus, status: 'syncing' },
                isLoading: false 
            });
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to trigger sync';
            set({ error: errorMsg, isLoading: false });
            useErrorStore.getState().dispatchError(errorMsg);
        }
    },
}));
