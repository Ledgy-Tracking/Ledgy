import { create } from 'zustand';
import { getProfileDb, save_sync_config, get_sync_config, setup_sync } from '../lib/db';
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
            if (!authState.isUnlocked || !authState.encryptionKey) {
                throw new Error('Vault must be unlocked to load sync config.');
            }

            const db = getProfileDb(profileId);
            const config = await get_sync_config(db, profileId, authState.encryptionKey);
            set({ syncConfig: config, isLoading: false });
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
            if (!authState.isUnlocked || !authState.encryptionKey) {
                throw new Error('Vault must be unlocked to save sync config.');
            }

            const db = getProfileDb(profileId);
            await save_sync_config(db, profileId, config, authState.encryptionKey);

            // Reload after save to get fully populated object
            const updatedConfig = await get_sync_config(db, profileId, authState.encryptionKey);
            set({ syncConfig: updatedConfig, isLoading: false });
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to save sync config';
            set({ error: errorMsg, isLoading: false });
            useErrorStore.getState().dispatchError(errorMsg);
        }
    },

    triggerSync: async (profileId: string) => {
        const { syncConfig, syncStatus } = get();
        if (syncStatus.status === 'syncing') return;

        set({ isLoading: true, error: null });
        try {
            const authState = useAuthStore.getState();
            if (!authState.isUnlocked || !authState.encryptionKey) {
                throw new Error('Vault must be unlocked for sync.');
            }

            // Ensure config is loaded
            let config = syncConfig;
            if (!config || config.profileId !== profileId) {
                const db = getProfileDb(profileId);
                config = await get_sync_config(db, profileId, authState.encryptionKey);
                if (!config) {
                    throw new Error('Sync not configured for this profile.');
                }
                set({ syncConfig: config });
            }

            // Cancel existing sync if any
            const db = getProfileDb(profileId);
            db.cancelSync();

            // Setup new sync
            const sync = setup_sync(profileId, config);
            set({ syncStatus: { ...get().syncStatus, status: 'syncing' }, isLoading: false });

            (sync as any).on('change', async (info: any) => {
                set({
                    syncStatus: {
                        ...get().syncStatus,
                        lastSync: new Date().toISOString()
                    }
                });

                // Support both replication and changes event formats
                const docs = info.docs || (info.change && info.change.docs);

                if (docs) {
                    const profile_db = getProfileDb(profileId);
                    for (const doc of docs) {
                        if (doc._conflicts && doc._conflicts.length > 0) {
                            // Fetch all versions to create ConflictEntry
                            try {
                                const localDoc = await (profile_db as any).db.get(doc._id);
                                const remoteDoc = await (profile_db as any).db.get(doc._id, { rev: doc._conflicts[0] });

                                const fields = Object.keys({ ...localDoc, ...remoteDoc }).filter(f => !f.startsWith('_') && f !== 'type' && f !== 'schemaVersion');
                                const conflictingFields = fields.filter(f => JSON.stringify(localDoc[f]) !== JSON.stringify(remoteDoc[f]));

                                get().addConflict({
                                    entryId: doc._id,
                                    entryName: localDoc.title || localDoc.name || doc._id,
                                    ledgerName: localDoc.ledgerName || 'Unknown Ledger',
                                    localVersion: {
                                        data: localDoc,
                                        timestamp: localDoc.updatedAt || new Date().toISOString(),
                                        deviceId: 'Local'
                                    },
                                    remoteVersion: {
                                        data: remoteDoc,
                                        timestamp: remoteDoc.updatedAt || new Date().toISOString(),
                                        deviceId: 'Remote'
                                    },
                                    conflictingFields
                                });
                            } catch (err) {
                                console.error('Error fetching conflict documents:', err);
                            }
                        }
                    }
                }
            });

            (sync as any).on('paused', (err: any) => {
                console.log('Sync paused:', err);
                set({ syncStatus: { ...get().syncStatus, status: 'idle' } });
            });

            (sync as any).on('active', () => {
                console.log('Sync active');
                set({ syncStatus: { ...get().syncStatus, status: 'syncing' } });
            });

            (sync as any).on('error', (err: any) => {
                console.error('Sync error:', err);
                set({
                    syncStatus: { ...get().syncStatus, status: 'offline' },
                    error: `Sync error: ${err?.message || 'Unknown error'}`
                });
                useErrorStore.getState().dispatchError(`Sync failed: ${err?.message || 'Unknown error'}`);
            });

            if (!config.continuous) {
                (sync as any).on('complete', () => {
                    set({
                        syncStatus: {
                            ...get().syncStatus,
                            status: 'idle',
                            lastSync: new Date().toISOString()
                        }
                    });
                });
            }

        } catch (err: any) {
            const errorMsg = err.message || 'Failed to trigger sync';
            set({ error: errorMsg, isLoading: false, syncStatus: { status: 'offline' } });
            useErrorStore.getState().dispatchError(errorMsg);
        }
    },
}));
