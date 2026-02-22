import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ProfileMetadata } from '../types/profile';
import { getProfileDb, closeProfileDb, create_profile_encrypted, list_profiles, decryptProfileMetadata } from '../lib/db';
import { useErrorStore } from './useErrorStore';
import { useAuthStore } from '../features/auth/useAuthStore';
import { encryptPayload, decryptPayload } from '../lib/crypto';

interface ProfileState {
    profiles: ProfileMetadata[];
    activeProfileId: string | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchProfiles: () => Promise<void>;
    setActiveProfile: (id: string) => void;
    createProfile: (name: string, description?: string) => Promise<string>;
    deleteProfile: (id: string) => Promise<void>;
}

export const useProfileStore = create<ProfileState>()(
    persist(
        (set, get) => ({
            profiles: [],
            activeProfileId: null,
            isLoading: false,
            error: null,

            fetchProfiles: async () => {
                set({ isLoading: true, error: null });
                try {
                    // Auth Guard: Ensure vault is unlocked before accessing profile data
                    const authState = useAuthStore.getState();
                    if (!authState.isUnlocked) {
                        throw new Error('Vault must be unlocked to fetch profiles.');
                    }
                    if (!authState.encryptionKey) {
                        throw new Error('Encryption key not available. Please lock and unlock again.');
                    }

                    const masterDb = getProfileDb('master');
                    const profileDocs = await list_profiles(masterDb);

                    // Decrypt profile metadata using DAL function
                    const profiles = await decryptProfileMetadata(profileDocs, authState.encryptionKey);

                    set({ profiles, isLoading: false });
                } catch (err: any) {
                    // Refined Error Handling: Specific error messages based on PouchDB error codes
                    const status = err.status || err.name || 'UnknownError';
                    let errorMsg = err.message || `Failed to fetch profiles (${status})`;
                    
                    if (status === 404) {
                        errorMsg = 'Profile database not found. Please create a new profile.';
                    } else if (status === 'unauthorized' || err.message?.includes('unlock')) {
                        errorMsg = 'Authentication required. Please unlock the vault.';
                    }
                    
                    set({ error: errorMsg, isLoading: false });
                    useErrorStore.getState().dispatchError(errorMsg);
                }
            },

            setActiveProfile: async (id: string) => {
                const currentId = get().activeProfileId;
                if (currentId && currentId !== id) {
                    await closeProfileDb(currentId);
                }
                set({ activeProfileId: id });
            },

            createProfile: async (name: string, description?: string): Promise<string> => {
                set({ isLoading: true, error: null });
                try {
                    const masterDb = getProfileDb('master');
                    const authState = useAuthStore.getState();

                    // Stabilization: Ensure we are unlocked before proceeding
                    if (!authState.isUnlocked) {
                        throw new Error('Vault must be unlocked to create a profile.');
                    }

                    const encryptionKey = authState.encryptionKey;
                    if (!encryptionKey) {
                        throw new Error('Encryption key is unavailable. Please try locking and unlocking again.');
                    }

                    // Validate: Prevent duplicate profile names (handles both encrypted and legacy profiles)
                    const existingProfiles = await list_profiles(masterDb);
                    const authStateCurrent = useAuthStore.getState();
                    const key = authStateCurrent.encryptionKey;

                    // Check for duplicate names by decrypting encrypted profiles OR checking legacy plain names
                    for (const doc of existingProfiles) {
                        let existingName: string | null = null;
                        
                        if (doc.name_enc && key) {
                            // Encrypted profile - decrypt for comparison
                            try {
                                const iv = new Uint8Array(doc.name_enc.iv);
                                const ciphertext = new Uint8Array(doc.name_enc.ciphertext).buffer;
                                existingName = await decryptPayload(key, iv, ciphertext);
                            } catch (e) {
                                console.error('Failed to decrypt profile name for validation:', e);
                            }
                        } else if (doc.name) {
                            // Legacy unencrypted profile
                            existingName = doc.name;
                        }
                        
                        if (existingName && existingName.toLowerCase() === name.toLowerCase()) {
                            throw new Error(`A profile with the name "${name}" already exists.`);
                        }
                    }

                    // Encrypt the profile metadata
                    const nameEnc = await encryptPayload(encryptionKey, name);
                    const encryptedName = {
                        iv: nameEnc.iv,
                        ciphertext: Array.from(new Uint8Array(nameEnc.ciphertext))
                    };
                    
                    let encryptedDescription = undefined;
                    if (description) {
                        const descEnc = await encryptPayload(encryptionKey, description);
                        encryptedDescription = {
                            iv: descEnc.iv,
                            ciphertext: Array.from(new Uint8Array(descEnc.ciphertext))
                        };
                    }

                    // Use the DAL function to create the profile with encrypted metadata
                    const profileId = await create_profile_encrypted(masterDb, encryptedName, encryptedDescription);

                    // Initialize the profile database with encrypted metadata
                    const profileDb = getProfileDb(profileId);
                    await profileDb.createDocument('profile_init', {
                        initialized: true,
                        name_enc: encryptedName,
                        description_enc: encryptedDescription
                    });
                    
                    await get().fetchProfiles();
                    
                    // Return the profile ID so UI can auto-select it
                    return profileId;
                } catch (err: any) {
                    const status = err.status || err.name || 'UnknownError';
                    const errorMsg = err.message || `Failed to create profile (${status})`;
                    set({ error: errorMsg, isLoading: false });
                    useErrorStore.getState().dispatchError(errorMsg);
                    throw err;
                }
            },

            deleteProfile: async (id: string) => {
                set({ isLoading: true, error: null });
                try {
                    // Auth Guard: Ensure vault is unlocked before deleting profile data
                    const authState = useAuthStore.getState();
                    if (!authState.isUnlocked) {
                        throw new Error('Vault must be unlocked to delete a profile.');
                    }

                    const masterDb = getProfileDb('master');

                    // NFR12 Compliance: Close and destroy actual profile database FIRST
                    // If this fails, we MUST NOT mark as deleted in master (rollback safety)
                    await closeProfileDb(id);
                    const profileDb = getProfileDb(id);
                    await profileDb.destroy();
                    // Note: destroy() already calls delete profileDatabases[this.profileId]

                    // Only after successful destroy, mark as deleted in master
                    const profileDoc = await masterDb.getDocument<any>(id);
                    await masterDb.updateDocument(id, {
                        ...profileDoc,
                        isDeleted: true,
                        deletedAt: new Date().toISOString()
                    });

                    await get().fetchProfiles();
                    if (get().activeProfileId === id) {
                        set({ activeProfileId: null });
                    }
                } catch (err: any) {
                    // Refined Error Handling: Specific error messages
                    const status = err.status || err.name || 'UnknownError';
                    let errorMsg = err.message || `Failed to delete profile (${status})`;
                    
                    if (status === 404) {
                        errorMsg = 'Profile not found. It may have already been deleted.';
                    } else if (status === 'unauthorized' || err.message?.includes('unlock')) {
                        errorMsg = 'Authentication required. Please unlock the vault.';
                    }
                    
                    set({ error: errorMsg, isLoading: false });
                    useErrorStore.getState().dispatchError(errorMsg);
                }
            },
        }),
        {
            name: 'ledgy-profile-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                activeProfileId: state.activeProfileId,
            }),
        }
    )
);
