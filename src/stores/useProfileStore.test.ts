import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { useProfileStore } from './useProfileStore';
import { getProfileDb, _clearProfileDatabases } from '../lib/db';
import { useAuthStore } from '../features/auth/useAuthStore';
import PouchDB from 'pouchdb';

describe('useProfileStore Encryption', () => {
    // Mock key
    const mockKey: CryptoKey = { type: 'secret', algorithm: { name: 'AES-GCM' }, extractable: false, usages: ['encrypt', 'decrypt'] } as any;

    beforeEach(async () => {
        vi.clearAllMocks();
        _clearProfileDatabases();

        // -----------------------------------------------------------------------
        // Mock Crypto (Vitest lacks full WebCrypto support in JSDOM)
        // -----------------------------------------------------------------------
        vi.mock('../lib/crypto', () => ({
            encryptPayload: vi.fn().mockResolvedValue({
                iv: [1, 2, 3],
                ciphertext: new Uint8Array([1, 2, 3]).buffer,
            }),
            decryptPayload: vi.fn().mockResolvedValue('Decrypted Material'),
        }));

        useProfileStore.setState({
            profiles: [],
            activeProfileId: null,
            isLoading: false,
            error: null,
        });

        useAuthStore.setState({
            encryptionKey: mockKey,
            isUnlocked: true
        });

        const masterDb = getProfileDb('master');
        await masterDb.destroy();
        _clearProfileDatabases();
    });

    // Cleanup: Destroy test databases after all tests
    afterAll(async () => {
        try {
            const masterDb = new PouchDB('ledgy_profile_master');
            await masterDb.destroy();
        } catch (e) {
            // Ignore - might not exist
        }
        _clearProfileDatabases();
    });

    it('should encrypt profile name on creation', async () => {
        const store = useProfileStore.getState();
        await store.createProfile('Secret Profile');

        const masterDb = getProfileDb('master');
        const docs = await masterDb.getAllDocuments<any>('profile');

        expect(docs).toHaveLength(1);
        expect(docs[0].name_enc).toBeDefined();
        expect(docs[0].name).toBeUndefined(); // Plain name should not be stored
    });

    it('should decrypt profile name on fetch', async () => {
        const { decryptPayload } = await import('../lib/crypto');
        (decryptPayload as any).mockResolvedValue('Secret Profile');

        const store = useProfileStore.getState();
        await store.createProfile('Secret Profile');

        // Clear state and fetch
        useProfileStore.setState({ profiles: [] });
        await store.fetchProfiles();

        const state = useProfileStore.getState();
        expect(state.profiles[0].name).toBe('Secret Profile');
    });

    it('should handle unencrypted profiles (legacy support)', async () => {
        const masterDb = getProfileDb('master');
        await masterDb.createDocument('profile', { name: 'Legacy' });

        await useProfileStore.getState().fetchProfiles();

        expect(useProfileStore.getState().profiles[0].name).toBe('Legacy');
    });
});
