import { LedgyDocument } from './profile';

/**
 * Sync configuration document
 */
export interface SyncConfig extends LedgyDocument {
    _type: 'sync_config';
    profileId: string;
    remoteUrl_enc?: {
        iv: number[];
        ciphertext: number[];
    };
    remoteUrl?: string; // Legacy unencrypted
    username_enc?: {
        iv: number[];
        ciphertext: number[];
    };
    password_enc?: {
        iv: number[];
        ciphertext: number[];
    };
    syncDirection: 'upload' | 'two-way';
    continuous: boolean;
    lastSyncAt?: string;
    syncStatus: 'idle' | 'syncing' | 'pending' | 'conflict' | 'offline';
}

/**
 * Sync status for UI
 */
export interface SyncStatus {
    status: 'idle' | 'syncing' | 'pending' | 'conflict' | 'offline' | 'synced';
    lastSync?: string;
    pendingChanges?: number;
    conflictCount?: number;
}
