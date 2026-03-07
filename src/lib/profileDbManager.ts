/**
 * Profile Database Manager
 *
 * Manages multiple profile databases with proper isolation.
 * Each profile has its own dedicated database: `ledgy-profile-{profileId}`
 *
 * Features:
 * - Profile CRUD operations
 * - Database lifecycle management
 * - Profile switching with event emission
 * - Default profile creation on first launch
 */

import { getProfileDb, list_profiles, create_profile_encrypted, hard_delete_profile } from './db';
import { ProfileMetadata } from '../types/profile';
import { encryptPayload, decryptPayload } from './crypto';
import { useErrorStore } from '../stores/useErrorStore';

// Database naming convention (kebab-case as per story spec)
const DB_NAME_PREFIX = 'ledgy-profile-';

// Event name constant for profile switch
const PROFILE_SWITCH_EVENT = 'ledgy:profile:switch';

// Type alias for Web Crypto API key
type EncryptionKey = CryptoKey;

/**
 * Sanitize profile name for DB-safe identifier
 * Removes special characters and ensures valid database name
 */
export function sanitizeProfileName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .substring(0, 50);
}

/**
 * Generate a unique profile ID
 */
export function generateProfileId(): string {
    return crypto.randomUUID();
}

/**
 * Get the database name for a profile
 */
export function getProfileName(profileId: string): string {
    return `${DB_NAME_PREFIX}${profileId}`;
}

/**
 * Profile DB Manager class for multi-DB management
 */
export class ProfileDbManager {
    private static instance: ProfileDbManager | null = null;
    private activeProfileId: string | null = null;
    private profileDbCache: Map<string, any> = new Map();

    private constructor() {}

    /**
     * Get singleton instance (lazy initialization)
     * Note: JavaScript is single-threaded, so no locking is needed
     */
    static getInstance(): ProfileDbManager {
        if (!ProfileDbManager.instance) {
            ProfileDbManager.instance = new ProfileDbManager();
        }
        return ProfileDbManager.instance;
    }

    /**
     * Check if profiles database exists and has profiles
     */
    async hasProfiles(masterDb: any): Promise<boolean> {
        try {
            const profiles = await list_profiles(masterDb);
            return profiles.length > 0;
        } catch {
            return false;
        }
    }

    /**
     * Create default profile on first launch
     */
    async createDefaultProfile(
        masterDb: any,
        encryptionKey: EncryptionKey
    ): Promise<string> {
        const profileName = 'Default Profile';
        const profileId = generateProfileId();

        try {
            // Encrypt profile name
            const nameEnc = await encryptPayload(encryptionKey, profileName);
            const encryptedName = {
                iv: nameEnc.iv,
                ciphertext: Array.from(new Uint8Array(nameEnc.ciphertext)),
            };

            // Create profile in master database
            await create_profile_encrypted(masterDb, encryptedName, undefined);

            // Initialize profile database
            const profileDb = getProfileDb(profileId);
            await profileDb.createDocument('profile_init', {
                initialized: true,
                isDefault: true,
            });

            return profileId;
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to create default profile';
            useErrorStore.getState().dispatchError(errorMsg, 'error');
            throw error;
        }
    }

    /**
     * Get list of all profiles
     */
    async getProfiles(
        masterDb: any,
        encryptionKey: EncryptionKey
    ): Promise<ProfileMetadata[]> {
        try {
            const profileDocs = await list_profiles(masterDb);
            const profiles: ProfileMetadata[] = [];

            for (const doc of profileDocs) {
                let name = 'Unknown';
                let description: string | undefined;

                // Decrypt profile metadata
                if (doc.name_enc && encryptionKey) {
                    try {
                        const iv = new Uint8Array(doc.name_enc.iv);
                        const ciphertext = new Uint8Array(doc.name_enc.ciphertext).buffer;
                        name = await decryptPayload(encryptionKey, iv, ciphertext);
                    } catch (e) {
                        console.error('Failed to decrypt profile name:', e);
                    }
                } else if (doc.name) {
                    // Legacy unencrypted profile
                    name = doc.name;
                }

                if (doc.description_enc && encryptionKey) {
                    try {
                        const iv = new Uint8Array(doc.description_enc.iv);
                        const ciphertext = new Uint8Array(doc.description_enc.ciphertext).buffer;
                        description = await decryptPayload(encryptionKey, iv, ciphertext);
                    } catch (e) {
                        console.error('Failed to decrypt profile description:', e);
                    }
                }

                profiles.push({
                    id: doc._id.replace('profile:', ''),
                    name,
                    description,
                    createdAt: doc.createdAt,
                    updatedAt: doc.updatedAt,
                    remoteSyncEndpoint: doc.remoteSyncEndpoint,
                });
            }

            return profiles;
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to fetch profiles';
            useErrorStore.getState().dispatchError(errorMsg, 'error');
            throw error;
        }
    }

    /**
     * Create a new profile
     */
    async createProfile(
        masterDb: any,
        name: string,
        description: string | undefined,
        encryptionKey: EncryptionKey
    ): Promise<string> {
        try {
            // Generate profile ID
            const profileId = generateProfileId();

            // Encrypt profile metadata
            const nameEnc = await encryptPayload(encryptionKey, name);
            const encryptedName = {
                iv: nameEnc.iv,
                ciphertext: Array.from(new Uint8Array(nameEnc.ciphertext)),
            };

            let encryptedDescription = undefined;
            if (description) {
                const descEnc = await encryptPayload(encryptionKey, description);
                encryptedDescription = {
                    iv: descEnc.iv,
                    ciphertext: Array.from(new Uint8Array(descEnc.ciphertext)),
                };
            }

            // Create profile in master database
            await create_profile_encrypted(masterDb, encryptedName, encryptedDescription);

            // Initialize profile database
            const profileDb = getProfileDb(profileId);
            await profileDb.createDocument('profile_init', {
                initialized: true,
                name_enc: encryptedName,
                description_enc: encryptedDescription,
            });

            // Cache the database instance
            this.profileDbCache.set(profileId, profileDb);

            return profileId;
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to create profile';
            useErrorStore.getState().dispatchError(errorMsg, 'error');
            throw error;
        }
    }

    /**
     * Delete a profile and its database
     * @param masterDb - The master database instance
     * @param profileId - The ID of the profile to delete
     * @returns Object with success status and optional error message
     * @returns success: true if deletion succeeded, false otherwise
     * @returns error: Error message if deletion failed (only present when success is false)
     */
    async deleteProfile(
        masterDb: any,
        profileId: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Close the profile database if open
            await this.closeProfileDb(profileId);

            // Get the database instance and DESTROY it (not just close)
            const profileDb = getProfileDb(profileId);
            await profileDb.destroy();

            // Hard-delete the profile record from master DB
            await hard_delete_profile(masterDb, profileId);

            return { success: true };
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to delete profile';
            useErrorStore.getState().dispatchError(errorMsg, 'error');
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Get or create profile database instance
     */
    getProfileDb(profileId: string): any {
        if (!this.profileDbCache.has(profileId)) {
            const db = getProfileDb(profileId);
            this.profileDbCache.set(profileId, db);
        }
        return this.profileDbCache.get(profileId);
    }

    /**
     * Close a profile database
     */
    async closeProfileDb(profileId: string): Promise<void> {
        const db = this.profileDbCache.get(profileId);
        if (db) {
            try {
                await db.close();
                this.profileDbCache.delete(profileId);
            } catch (error) {
                console.error('Failed to close profile database:', error);
                // Propagate error for proper handling
                throw error;
            }
        }
    }

    /**
     * Switch to a different profile
     */
    async switchProfile(profileId: string): Promise<void> {
        const currentId = this.activeProfileId;

        // Don't switch to the same profile
        if (currentId === profileId) {
            return;
        }

        // Close current profile database
        if (currentId) {
            await this.closeProfileDb(currentId);
        }

        // Load target profile database (cached)
        this.getProfileDb(profileId);

        // Update active profile
        this.activeProfileId = profileId;

        // Emit profile switch event (for other stores to react)
        this.emitProfileSwitchEvent(profileId);
    }

    /**
     * Get current active profile ID
     */
    getActiveProfileId(): string | null {
        return this.activeProfileId;
    }

    /**
     * Emit profile switch event for other stores to react
     * @param profileId - The ID of the profile being switched to
     */
    private emitProfileSwitchEvent(profileId: string): void {
        // Log profile switch for debugging
        console.log(`Profile switched to: ${profileId}`);

        // Emit custom event for other components to listen
        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent(PROFILE_SWITCH_EVENT, { detail: { profileId } })
            );
        }
    }

    /**
     * Validate profile name uniqueness
     */
    async validateProfileNameUnique(
        masterDb: any,
        name: string,
        encryptionKey: EncryptionKey,
        excludeProfileId?: string
    ): Promise<boolean> {
        try {
            const profiles = await this.getProfiles(masterDb, encryptionKey);
            const normalizedName = name.toLowerCase();

            for (const profile of profiles) {
                if (excludeProfileId && profile.id === excludeProfileId) {
                    continue;
                }
                if (profile.name.toLowerCase() === normalizedName) {
                    return false;
                }
            }

            return true;
        } catch {
            return false;
        }
    }
}

// Export singleton instance
export const profileDbManager = ProfileDbManager.getInstance();
