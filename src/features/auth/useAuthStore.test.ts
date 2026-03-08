import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './useAuthStore';
import { encodeSecret, generateSecret } from '../../lib/totp';

// Mocking verifyTOTP to always return true for testing store logic
vi.mock('../../lib/totp', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../lib/totp')>();
    return {
        ...actual,
        verifyTOTP: vi.fn().mockResolvedValue(true),
    };
});

const resetState = () => useAuthStore.setState({
    totpSecret: null,
    encryptedTotpSecret: null,
    salt: null,
    isUnlocked: false,
    encryptionKey: null,
    rememberMe: false,
    rememberMeExpiry: null,
    rememberMeExpiryMs: null,
    needsPassphrase: false,
    isLoading: false,
    error: null,
});

describe('useAuthStore', () => {
    beforeEach(resetState);

    it('generates a unique salt during registration', async () => {
        const secret = encodeSecret(generateSecret());
        const code = '123456';

        await useAuthStore.getState().verifyAndRegister(secret, code, false);

        const state1 = useAuthStore.getState();
        const salt1 = state1.salt;
        expect(salt1).not.toBeNull();

        // Register again to see if salt is different
        resetState();
        await useAuthStore.getState().verifyAndRegister(secret, code, false);

        const state2 = useAuthStore.getState();
        const salt2 = state2.salt;
        expect(salt2).not.toBeNull();
        expect(salt2).not.toBe(salt1);
    });

    it('uses the stored salt during unlock', async () => {
        const secret = encodeSecret(generateSecret());
        const code = '123456';

        // Register first
        await useAuthStore.getState().verifyAndRegister(secret, code, false);
        const registeredSalt = useAuthStore.getState().salt;
        expect(registeredSalt).not.toBeNull();

        // Lock
        await useAuthStore.getState().lock();
        expect(useAuthStore.getState().isUnlocked).toBe(false);

        // Unlock
        const success = await useAuthStore.getState().unlock(code, false);
        expect(success).toBe(true);
        expect(useAuthStore.getState().isUnlocked).toBe(true);
        expect(useAuthStore.getState().salt).toBe(registeredSalt);
    });

    it('handles backward compatibility for missing salt', async () => {
        const secret = encodeSecret(generateSecret());
        const code = '123456';

        // Manually set secret but no salt (simulating old state)
        useAuthStore.setState({
            totpSecret: secret,
            salt: null,
            isUnlocked: false,
            encryptionKey: null
        });

        const success = await useAuthStore.getState().unlock(code, false);
        // It should succeed because of the fallback
        expect(success).toBe(true);
        expect(useAuthStore.getState().isUnlocked).toBe(true);
        expect(useAuthStore.getState().salt).toBeNull(); // State salt remains null
    });
});
