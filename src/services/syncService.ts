/**
 * Sync Service
 * Handles PouchDB replication and conflict resolution
 * Story 5-4: Conflict Resolution (Accept/Reject)
 * Story 5-5: Remote Purge (Right to be Forgotten)
 */

import { getProfileDb, closeProfileDb } from '../lib/db';
import { ConflictEntry } from '../features/sync/ConflictListSheet';

/**
 * Remote sync configuration
 */
export interface RemoteSyncConfig {
    url: string;
    username?: string;
    password?: string;
}

/**
 * Delete remote database via CouchDB/PouchDB sync
 */
export async function deleteRemoteDatabase(
    remoteConfig: RemoteSyncConfig
): Promise<void> {
    try {
        console.log(`Deleting remote database at: ${remoteConfig.url}`);

        const headers: HeadersInit = {};
        if (remoteConfig.username && remoteConfig.password) {
            // Use Basic Auth for CouchDB
            const authString = btoa(`${remoteConfig.username}:${remoteConfig.password}`);
            headers['Authorization'] = `Basic ${authString}`;
        }

        const response = await fetch(remoteConfig.url, {
            method: 'DELETE',
            headers,
        });

        if (!response.ok) {
            // CouchDB returns 404 if DB doesn't exist, which is fine for deletion
            if (response.status !== 404) {
                const errorText = await response.text();
                throw new Error(`Remote server returned ${response.status}: ${errorText}`);
            }
        }

        console.log('Remote database deleted successfully');
    } catch (err: any) {
        // Check for network errors
        if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
            throw new Error('NETWORK_UNREACHABLE');
        }
        throw err;
    }
}

/**
 * Delete profile with remote purge (Right to be Forgotten)
 * Attempts remote deletion first, then local
 */
export async function deleteProfileWithRemote(
    profileId: string,
    remoteConfig?: RemoteSyncConfig,
    forceLocalOnly: boolean = false
): Promise<{ success: boolean; remoteDeleted: boolean; error?: string }> {
    let remoteDeleted = false;
    let error: string | undefined;

    // Try remote deletion first if configured and not forcing local-only
    if (remoteConfig && !forceLocalOnly) {
        try {
            await deleteRemoteDatabase(remoteConfig);
            remoteDeleted = true;
        } catch (err: any) {
            error = err.message;
            // If network unreachable, offer user choice (handled by caller)
            if (err.message.includes('NETWORK_UNREACHABLE')) {
                return {
                    success: false,
                    remoteDeleted: false,
                    error: 'Remote server unreachable. Choose to force-delete locally or retry when online.',
                };
            }
        }
    }

    // Delete local PouchDB
    try {
        const db = getProfileDb(profileId);
        await db.destroy();
        await closeProfileDb(profileId);
    } catch (err: any) {
        error = `Failed to delete local database: ${err.message}`;
        return {
            success: false,
            remoteDeleted,
            error,
        };
    }

    return {
        success: true,
        remoteDeleted,
        error,
    };
}

/**
 * Resolve a conflict by accepting either local or remote version
 */
export async function resolveConflict(
    profileId: string,
    entryId: string,
    winningVersion: 'local' | 'remote',
    conflict: ConflictEntry
): Promise<void> {
    const winner = winningVersion === 'local'
        ? conflict.localVersion.data
        : conflict.remoteVersion.data;

    await resolveConflictWithCustomData(profileId, entryId, winner);
    console.log(`Conflict resolved for ${entryId}: ${winningVersion} version accepted`);
}

/**
 * Merge field-level values from local and remote versions
 */
export function mergeConflictVersions(
    conflict: ConflictEntry,
    fieldChoices: Record<string, 'local' | 'remote'>
): any {
    const merged: any = { ...conflict.localVersion.data };

    // Apply field-level choices
    Object.keys(fieldChoices).forEach(field => {
        const choice = fieldChoices[field];
        if (choice === 'remote' && conflict.remoteVersion.data[field] !== undefined) {
            merged[field] = conflict.remoteVersion.data[field];
        } else if (choice === 'local') {
            merged[field] = conflict.localVersion.data[field];
        }
    });

    return merged;
}

/**
 * Resolve conflict with merged data
 */
export async function resolveConflictWithMerge(
    profileId: string,
    entryId: string,
    conflict: ConflictEntry,
    fieldChoices: Record<string, 'local' | 'remote'>
): Promise<void> {
    const mergedData = mergeConflictVersions(conflict, fieldChoices);
    await resolveConflictWithCustomData(profileId, entryId, mergedData);
}

/**
 * Resolve conflict with custom merged data
 */
export async function resolveConflictWithCustomData(
    profileId: string,
    entryId: string,
    customData: any
): Promise<void> {
    const db = getProfileDb(profileId);

    try {
        // 1. Get the current document with conflicts list
        const currentDoc = await db.getDocument<any>(entryId, { conflicts: true });

        // 2. Remove all conflicting revisions
        if (currentDoc._conflicts) {
            for (const rev of currentDoc._conflicts) {
                try {
                    await db.removeRevision(entryId, rev);
                } catch (e) {
                    // Ignore if revision already gone
                    console.warn(`Could not remove revision ${rev} for ${entryId}:`, e);
                }
            }
        }

        // 3. Update with custom merged data, preserving envelope
        // Note: We use updateDocument which handles the _rev of the winner
        await db.updateDocument(entryId, {
            ...customData,
            // Preserve document envelope fields
            type: currentDoc.type,
            schemaVersion: currentDoc.schemaVersion,
        });

        console.log(`Conflict resolved for ${entryId} with specified data`);
    } catch (err: any) {
        console.error('Failed to resolve conflict with custom data:', err);
        throw new Error(`Failed to resolve conflict: ${err.message}`);
    }
}

/**
 * Skip conflict resolution (leave pending)
 * This is a no-op - the conflict remains in the store
 */
export function skipConflict(): void {
    // Intentionally empty - skipping means leaving the conflict as-is
    console.log('Conflict skipped - remains pending');
}
