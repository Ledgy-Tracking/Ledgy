import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { useProfileStore } from './useProfileStore';
import { getProfileDb, _clearProfileDatabases } from '../lib/db';
import { useAuthStore } from '../features/auth/useAuthStore';
import PouchDB from 'pouchdb';

// -----------------------------------------------------------------------
// Mock Crypto (Vitest lacks full WebCrypto support in JSDOM)
// -----------------------------------------------------------------------
vi.mock('../lib/crypto', () => ({
    encryptPayload: vi.fn().mockResolvedValue({
        iv: new Uint8Array([1, 2, 3]),
        ciphertext: new Uint8Array([1, 2, 3]).buffer,
    }),
    decryptPayload: vi.fn().mockResolvedValue('Decrypted Material'),
}));

describe('useProfileStore Encryption', () => {
    // Mock key
    const mockKey: CryptoKey = { type: 'secret', algorithm: { name: 'AES-GCM' }, extractable: false, usages: ['encrypt', 'decrypt'] } as any;
    const mockUserId = 'test-user-id';

    beforeEach(async () => {
        vi.clearAllMocks();
        _clearProfileDatabases();

        useProfileStore.setState({
            profiles: [],
            activeProfileId: null,
            isLoading: false,
            error: null,
        });

        useAuthStore.setState({
            encryptionKey: mockKey,
            isUnlocked: true,
            userId: mockUserId,
        });

        const userProfilesDb = getProfileDb(`profiles_${mockUserId}`);
        await (userProfilesDb as any).db.destroy();
        _clearProfileDatabases();
    });

    // Cleanup: Destroy test databases after all tests
    afterAll(async () => {
        try {
            const userProfilesDb = new PouchDB(`ledgy_profiles_${mockUserId}`);
            await userProfilesDb.destroy();
        } catch (e) {
            // Ignore - might not exist
        }
        _clearProfileDatabases();
    });

    it('should encrypt profile name on creation and store color/avatar', async () => {
        const store = useProfileStore.getState();
        await store.createProfile('Secret Profile', 'Desc', 'bg-emerald-500', 'SP');

        const userProfilesDb = getProfileDb(`profiles_${mockUserId}`);
        const docs = await userProfilesDb.getAllDocuments<any>('profile');

        expect(docs).toHaveLength(1);
        expect(docs[0].name_enc).toBeDefined();
        expect(docs[0].name).toBeUndefined(); // Plain name should not be stored
        expect(docs[0].color).toBe('bg-emerald-500');
        expect(docs[0].avatar).toBe('SP');
    });

    it('should decrypt profile name on fetch', async () => {
        const { decryptPayload } = await import('../lib/crypto');
        (decryptPayload as any).mockResolvedValue('Secret Profile');

        const store = useProfileStore.getState();
        await store.createProfile('Secret Profile', undefined, 'bg-emerald-500', 'SP');

        // Clear state and fetch
        useProfileStore.setState({ profiles: [] });
        await store.fetchProfiles();

        const state = useProfileStore.getState();
        expect(state.profiles).toHaveLength(1);
        expect(state.profiles[0].name).toBe('Secret Profile');
        expect(state.profiles[0].color).toBe('bg-emerald-500');
        expect(state.profiles[0].avatar).toBe('SP');
    });

    it('should handle unencrypted profiles (legacy support)', async () => {
        const userProfilesDb = getProfileDb(`profiles_${mockUserId}`);
        await userProfilesDb.createDocument('profile', { name: 'Legacy' });

        await useProfileStore.getState().fetchProfiles();

        expect(useProfileStore.getState().profiles).toHaveLength(1);
        expect(useProfileStore.getState().profiles[0].name).toBe('Legacy');
    });
});
