import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ProfileMetadata } from '../types/profile';
import { getProfileDb } from '../lib/db';
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
    createProfile: (name: string, description?: string) => Promise<void>;
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
                    const masterDb = getProfileDb('master');
                    const profileDocs = await masterDb.getAllDocuments<any>('profile');
                    const encryptionKey = useAuthStore.getState().encryptionKey;

                    const profiles = await Promise.all(profileDocs
                        .filter(doc => !doc.isDeleted)
                        .map(async doc => {
                            let name = doc.name;
                            let description = doc.description;

                            // If name is encrypted (object with iv/ciphertext), decrypt it
                            if (encryptionKey && doc.name_enc) {
                                try {
                                    const iv = new Uint8Array(doc.name_enc.iv);
                                    const ciphertext = new Uint8Array(doc.name_enc.ciphertext).buffer;
                                    name = await decryptPayload(encryptionKey, iv, ciphertext);

                                    if (doc.description_enc) {
                                        const dIv = new Uint8Array(doc.description_enc.iv);
                                        const dCiphertext = new Uint8Array(doc.description_enc.ciphertext).buffer;
                                        description = await decryptPayload(encryptionKey, dIv, dCiphertext);
                                    }
                                } catch (e) {
                                    console.error('Failed to decrypt profile name:', e);
                                    name = `[Encrypted Profile ${doc._id.slice(-4)}]`;
                                }
                            }

                            return {
                                id: doc._id,
                                name,
                                description,
                                createdAt: doc.createdAt,
                                updatedAt: doc.updatedAt,
                                remoteSyncEndpoint: doc.remoteSyncEndpoint,
                            };
                        }));
                    set({ profiles, isLoading: false });
                } catch (err: any) {
                    const errorMsg = err.message || 'Failed to fetch profiles';
                    set({ error: errorMsg, isLoading: false });
                    useErrorStore.getState().dispatchError(errorMsg);
                }
            },

            setActiveProfile: (id: string) => {
                set({ activeProfileId: id });
            },

            createProfile: async (name: string, description?: string) => {
                set({ isLoading: true, error: null });
                try {
                    const masterDb = getProfileDb('master');
                    const encryptionKey = useAuthStore.getState().encryptionKey;

                    let docData: any = { type: 'profile' };

                    if (encryptionKey) {
                        const nameEnc = await encryptPayload(encryptionKey, name);
                        docData.name_enc = {
                            iv: nameEnc.iv,
                            ciphertext: Array.from(new Uint8Array(nameEnc.ciphertext))
                        };
                        if (description) {
                            const descEnc = await encryptPayload(encryptionKey, description);
                            docData.description_enc = {
                                iv: descEnc.iv,
                                ciphertext: Array.from(new Uint8Array(descEnc.ciphertext))
                            };
                        }
                        // Store a hint for list identification if needed, or just leave it fully opaque
                    } else {
                        docData.name = name;
                        docData.description = description;
                    }

                    const response = await masterDb.createDocument('profile', docData);

                    if (response.ok) {
                        const profileDb = getProfileDb(response.id);
                        await profileDb.createDocument('profile_init', { initialized: true });
                        await get().fetchProfiles();
                    }
                } catch (err: any) {
                    const errorMsg = err.message || 'Failed to create profile';
                    set({ error: errorMsg, isLoading: false });
                    useErrorStore.getState().dispatchError(errorMsg);
                }
            },

            deleteProfile: async (id: string) => {
                set({ isLoading: true, error: null });
                try {
                    const masterDb = getProfileDb('master');
                    const profileDb = getProfileDb(id);
                    await profileDb.destroy();

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
                    const errorMsg = err.message || 'Failed to delete profile';
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
