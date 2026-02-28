import { LedgyDocument } from './profile';

/**
 * Sync configuration document
 */
export interface SyncConfig extends LedgyDocument {
    type: 'sync_config';
    profileId: string;
    remoteUrl_enc?: {
        iv: number[];
        ciphertext: number[];
    };
    remoteUrl?: string;
    username_enc?: {
        iv: number[];
        ciphertext: number[];
    };
    username?: string;
    password_enc?: {
        iv: number[];
        ciphertext: number[];
    };
    password?: string;
    syncDirection: 'upload' | 'two-way';
    continuous: boolean;
    lastSyncAt?: string;
    syncStatus: 'idle' | 'syncing' | 'pending' | 'conflict' | 'offline' | 'error';
}

/**
 * Sync status for UI
 */
export interface SyncStatus {
    status: 'idle' | 'syncing' | 'pending' | 'conflict' | 'offline' | 'synced' | 'error';
    lastSync?: string;
    lastError?: string;
    pendingChanges?: number;
    conflictCount?: number;
}
