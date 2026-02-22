import { create } from 'zustand';
import { getProfileDb } from '../lib/db';
import { useErrorStore } from './useErrorStore';
import { useAuthStore } from '../features/auth/useAuthStore';
import { SyncConfig, SyncStatus } from '../types/sync';

interface SyncState {
    syncConfig: SyncConfig | null;
    syncStatus: SyncStatus;
    isLoading: boolean;
    error: string | null;

    // Actions
    loadSyncConfig: (profileId: string) => Promise<void>;
    saveSyncConfig: (profileId: string, config: Partial<SyncConfig>) => Promise<void>;
    triggerSync: (profileId: string) => Promise<void>;
    updateSyncStatus: (status: Partial<SyncStatus>) => void;
    setConflictCount: (count: number) => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
    syncConfig: null,
    syncStatus: { status: 'idle' },
    isLoading: false,
    error: null,

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
