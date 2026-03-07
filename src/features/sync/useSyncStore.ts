import { create } from 'zustand';

export interface SyncConflict {
    entryId: string;
    localValue: Record<string, unknown>;
    remoteValue: Record<string, unknown>;
    conflictingFields: string[];
    localTimestamp: string;
    remoteTimestamp: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncState {
    // State fields
    isSyncing: boolean;
    isSyncEnabled: boolean;
    lastSyncTime: string | null;
    syncStatus: SyncStatus;
    syncConfig: Record<string, unknown> | null;
    conflicts: SyncConflict[];
    isLoading: boolean;
    error: string | null;

    // Actions
    triggerSync: () => Promise<void>;
    resolveConflict: (entryId: string, resolution: 'local' | 'remote' | 'merge', fieldValues?: Record<string, unknown>) => Promise<void>;
    clearConflicts: () => void;
    enableSync: () => void;
    disableSync: () => void;
    // Memory Sweep
    clearProfileData: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
    // Initial state
    isSyncing: false,
    isSyncEnabled: false,
    lastSyncTime: null,
    syncStatus: 'idle',
    syncConfig: null,
    conflicts: [],
    isLoading: false,
    error: null,

    triggerSync: async () => {
        if (!get().isSyncEnabled) {
            return;
        }

        set({ isSyncing: true, syncStatus: 'syncing', error: null });
        try {
            // TODO: Implement PouchDB replication in Story 1.5
            // For now, mock implementation
            await new Promise(resolve => setTimeout(resolve, 500));

            set({
                isSyncing: false,
                syncStatus: 'success',
                lastSyncTime: new Date().toISOString(),
            });

            // Reset status after 3 seconds
            setTimeout(() => {
                if (get().syncStatus === 'success') {
                    set({ syncStatus: 'idle' });
                }
            }, 3000);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Sync failed';
            set({ error: errorMessage, isSyncing: false, syncStatus: 'error' });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    resolveConflict: async (entryId: string, _resolution: 'local' | 'remote' | 'merge', _fieldValues?: Record<string, unknown>) => {
        set({ isLoading: true, error: null });
        try {
            // TODO: Implement conflict resolution in Story 1.5
            // For now, mock implementation
            const updatedConflicts = get().conflicts.filter(c => c.entryId !== entryId);
            set({ conflicts: updatedConflicts, isLoading: false });

            // Trigger sync to apply resolution
            await get().triggerSync();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to resolve conflict';
            set({ error: errorMessage, isLoading: false });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    clearConflicts: () => {
        set({ conflicts: [] });
    },

    enableSync: () => {
        set({ isSyncEnabled: true });
    },

    disableSync: () => {
        set({ isSyncEnabled: false });
    },

    clearProfileData: () => {
        set({
            isSyncing: false,
            isSyncEnabled: false,
            lastSyncTime: null,
            syncStatus: 'idle',
            syncConfig: null,
            conflicts: [],
            isLoading: false,
            error: null,
        });
    },
}));
