import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from '../src/features/auth/useAuthStore';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../src/lib/crypto', () => ({
    HKDF_SALT: 'ledgy-salt-v1',
    deriveKeyFromTotp: vi.fn().mockResolvedValue({ type: 'secret', algorithm: { name: 'AES-GCM' } }),
    deriveKeyFromPassphrase: vi.fn().mockResolvedValue({ type: 'secret', algorithm: { name: 'AES-GCM' } }),
    encryptPayload: vi.fn().mockResolvedValue({
        iv: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        ciphertext: new ArrayBuffer(32),
    }),
    decryptPayload: vi.fn().mockResolvedValue('JBSWY3DPEHPK3PXP'),
}));

vi.mock('../src/lib/totp', () => ({
    decodeSecret: vi.fn().mockReturnValue(new Uint8Array(20)),
    verifyTotp: vi.fn().mockResolvedValue(true),
}));

// Mock crypto.getRandomValues used for PBKDF2 salt generation
Object.defineProperty(globalThis, 'crypto', {
    value: {
        getRandomValues: vi.fn((arr: Uint8Array) => {
            arr.fill(42);
            return arr;
        }),
        subtle: {
            importKey: vi.fn(),
            deriveKey: vi.fn(),
            encrypt: vi.fn(),
            decrypt: vi.fn(),
        },
    },
    writable: true,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStore() {
    useAuthStore.setState({
        totpSecret: null,
        encryptedTotpSecret: null,
        isUnlocked: false,
        encryptionKey: null,
        rememberMe: false,
        rememberMeExpiry: null,
        rememberMeExpiryMs: null,
        needsPassphrase: false,
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAuthStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStore();
        // Seed a registered secret for most tests
        useAuthStore.setState({ totpSecret: 'JBSWY3DPEHPK3PXP' });
    });

    afterEach(() => {
        resetStore();
    });

    // -----------------------------------------------------------------------
    // unlock — basic
    // -----------------------------------------------------------------------
    describe('unlock', () => {
        it('returns true and sets isUnlocked on valid code', async () => {
            const { verifyTotp } = await import('../src/lib/totp');
            (verifyTotp as any).mockResolvedValue(true);

            const success = await useAuthStore.getState().unlock('123456', false);
            expect(success).toBe(true);
            expect(useAuthStore.getState().isUnlocked).toBe(true);
        });

        it('returns false and leaves locked on invalid code', async () => {
            const { verifyTotp } = await import('../src/lib/totp');
            (verifyTotp as any).mockResolvedValue(false);

            const success = await useAuthStore.getState().unlock('000000', false);
            expect(success).toBe(false);
            expect(useAuthStore.getState().isUnlocked).toBe(false);
        });

        it('sets rememberMe flag when remember=true', async () => {
            const { verifyTotp } = await import('../src/lib/totp');
            (verifyTotp as any).mockResolvedValue(true);

            await useAuthStore.getState().unlock('123456', true);
            expect(useAuthStore.getState().rememberMe).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // unlock — with passphrase (High item #1)
    // -----------------------------------------------------------------------
    describe('unlock with passphrase', () => {
        it('clears totpSecret and stores encryptedTotpSecret when passphrase is provided', async () => {
            const { verifyTotp } = await import('../src/lib/totp');
            const { encryptPayload } = await import('../src/lib/crypto');
            (verifyTotp as any).mockResolvedValue(true);
            (encryptPayload as any).mockResolvedValue({
                iv: Array(12).fill(1),
                ciphertext: new Uint8Array(32).buffer,
            });

            await useAuthStore.getState().unlock('123456', true, 'my-passphrase', null);

            const state = useAuthStore.getState();
            expect(state.totpSecret).toBeNull();
            expect(state.encryptedTotpSecret).not.toBeNull();
            expect(state.encryptedTotpSecret?.pbkdf2Salt).toBeDefined();
            expect(state.isUnlocked).toBe(true);
        });

        it('stores expiry timestamp when expiryMs is provided', async () => {
            const { verifyTotp } = await import('../src/lib/totp');
            (verifyTotp as any).mockResolvedValue(true);

            const before = Date.now();
            await useAuthStore.getState().unlock('123456', true, undefined, 3600_000);
            const after = Date.now();

            const expiry = useAuthStore.getState().rememberMeExpiry;
            expect(expiry).not.toBeNull();
            expect(expiry!).toBeGreaterThanOrEqual(before + 3600_000);
            expect(expiry!).toBeLessThanOrEqual(after + 3600_000);
        });

        it('stores null expiry when expiryMs is null (never)', async () => {
            const { verifyTotp } = await import('../src/lib/totp');
            (verifyTotp as any).mockResolvedValue(true);

            await useAuthStore.getState().unlock('123456', true, undefined, null);
            expect(useAuthStore.getState().rememberMeExpiry).toBeNull();
        });
    });

    // -----------------------------------------------------------------------
    // unlockWithPassphrase (High item #1)
    // -----------------------------------------------------------------------
    describe('unlockWithPassphrase', () => {
        it('returns false when no encryptedTotpSecret', async () => {
            const success = await useAuthStore.getState().unlockWithPassphrase('any-passphrase');
            expect(success).toBe(false);
        });

        it('decrypts secret and sets isUnlocked on correct passphrase', async () => {
            const { decryptPayload } = await import('../src/lib/crypto');
            (decryptPayload as any).mockResolvedValue('JBSWY3DPEHPK3PXP');

            useAuthStore.setState({
                totpSecret: null,
                encryptedTotpSecret: {
                    iv: Array(12).fill(1),
                    ciphertext: Array(32).fill(0),
                    pbkdf2Salt: Array(16).fill(42),
                },
            });

            const success = await useAuthStore.getState().unlockWithPassphrase('correct-pass');
            expect(success).toBe(true);
            expect(useAuthStore.getState().isUnlocked).toBe(true);
            expect(useAuthStore.getState().needsPassphrase).toBe(false);
        });

        it('returns false and stays locked on decryption error', async () => {
            const { decryptPayload } = await import('../src/lib/crypto');
            (decryptPayload as any).mockRejectedValue(new Error('Bad decrypt'));

            useAuthStore.setState({
                totpSecret: null,
                encryptedTotpSecret: {
                    iv: Array(12).fill(1),
                    ciphertext: Array(32).fill(0),
                    pbkdf2Salt: Array(16).fill(42),
                },
            });

            const success = await useAuthStore.getState().unlockWithPassphrase('wrong-pass');
            expect(success).toBe(false);
            expect(useAuthStore.getState().isUnlocked).toBe(false);
        });

        it('restores a fresh rememberMeExpiry from rememberMeExpiryMs after passphrase unlock', async () => {
            // Regression: previously unlockWithPassphrase never set rememberMeExpiry,
            // making the session eternal after the previous expiry was cleared.
            const { decryptPayload } = await import('../src/lib/crypto');
            (decryptPayload as any).mockResolvedValue('JBSWY3DPEHPK3PXP');

            useAuthStore.setState({
                totpSecret: null,
                encryptedTotpSecret: {
                    iv: Array(12).fill(1),
                    ciphertext: Array(32).fill(0),
                    pbkdf2Salt: Array(16).fill(42),
                },
                rememberMeExpiryMs: 3_600_000, // 1 hour — user's original preference
                rememberMeExpiry: null,         // cleared when previous session expired
            });

            const before = Date.now();
            const success = await useAuthStore.getState().unlockWithPassphrase('correct-pass');
            const after = Date.now();

            expect(success).toBe(true);
            const expiry = useAuthStore.getState().rememberMeExpiry;
            expect(expiry).not.toBeNull();
            expect(expiry!).toBeGreaterThanOrEqual(before + 3_600_000);
            expect(expiry!).toBeLessThanOrEqual(after + 3_600_000);
        });

        it('leaves rememberMeExpiry null when rememberMeExpiryMs is null (never-expire preference)', async () => {
            const { decryptPayload } = await import('../src/lib/crypto');
            (decryptPayload as any).mockResolvedValue('JBSWY3DPEHPK3PXP');

            useAuthStore.setState({
                totpSecret: null,
                encryptedTotpSecret: {
                    iv: Array(12).fill(1),
                    ciphertext: Array(32).fill(0),
                    pbkdf2Salt: Array(16).fill(42),
                },
                rememberMeExpiryMs: null,
                rememberMeExpiry: null,
            });

            await useAuthStore.getState().unlockWithPassphrase('correct-pass');
            expect(useAuthStore.getState().rememberMeExpiry).toBeNull();
        });
    });

    // -----------------------------------------------------------------------
    // initSession — session expiry (High item #2)
    // -----------------------------------------------------------------------
    describe('initSession — expiry', () => {
        it('clears unlock state when rememberMeExpiry is in the past', async () => {
            useAuthStore.setState({
                rememberMe: true,
                totpSecret: 'JBSWY3DPEHPK3PXP',
                isUnlocked: true,
                rememberMeExpiry: Date.now() - 1000, // already expired
            });

            await useAuthStore.getState().initSession();

            const state = useAuthStore.getState();
            expect(state.isUnlocked).toBe(false);
            expect(state.encryptionKey).toBeNull();
            expect(state.rememberMeExpiry).toBeNull();
        });

        it('forgets user and clears state when expiry is past, even if encryptedTotpSecret is set', async () => {
            // New behavior: strict logout on expiry
            useAuthStore.setState({
                rememberMe: true,
                totpSecret: null,
                encryptedTotpSecret: {
                    iv: Array(12).fill(1),
                    ciphertext: Array(32).fill(0),
                    pbkdf2Salt: Array(16).fill(42),
                },
                rememberMeExpiry: Date.now() - 1000, // already expired
            });

            await useAuthStore.getState().initSession();

            const state = useAuthStore.getState();
            expect(state.isUnlocked).toBe(false);
            expect(state.encryptionKey).toBeNull();
            expect(state.rememberMeExpiry).toBeNull();
            expect(state.encryptedTotpSecret).toBeNull(); // Should be cleared
            expect(state.rememberMe).toBe(false); // Should be cleared
            expect(state.needsPassphrase).toBe(false); // Should NOT prompt for passphrase
        });

        it('auto-unlocks when rememberMe is true, expiry is null, and no passphrase', async () => {
            useAuthStore.setState({
                rememberMe: true,
                totpSecret: 'JBSWY3DPEHPK3PXP',
                encryptionKey: null,
                rememberMeExpiry: null,
            });

            await useAuthStore.getState().initSession();
            expect(useAuthStore.getState().isUnlocked).toBe(true);
        });

        it('sets needsPassphrase when encryptedTotpSecret exists and rememberMe is true', async () => {
            useAuthStore.setState({
                rememberMe: true,
                totpSecret: null,
                encryptedTotpSecret: {
                    iv: Array(12).fill(1),
                    ciphertext: Array(32).fill(0),
                    pbkdf2Salt: Array(16).fill(42),
                },
            });

            await useAuthStore.getState().initSession();
            expect(useAuthStore.getState().needsPassphrase).toBe(true);
            expect(useAuthStore.getState().isUnlocked).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // lock — preserves rememberMe preference (Low item #7)
    // -----------------------------------------------------------------------
    describe('lock', () => {
        it('clears isUnlocked and encryptionKey but preserves rememberMe', () => {
            useAuthStore.setState({
                isUnlocked: true,
                encryptionKey: { type: 'secret' } as any,
                rememberMe: true,
            });

            useAuthStore.getState().lock();

            const state = useAuthStore.getState();
            expect(state.isUnlocked).toBe(false);
            expect(state.encryptionKey).toBeNull();
            expect(state.rememberMe).toBe(true); // preserved!
        });
    });

    // -----------------------------------------------------------------------
    // reset
    // -----------------------------------------------------------------------
    describe('reset', () => {
        it('clears all auth state', () => {
            useAuthStore.setState({
                totpSecret: 'JBSWY3DPEHPK3PXP',
                isUnlocked: true,
                encryptionKey: { type: 'secret' } as any,
                rememberMe: true,
                rememberMeExpiry: Date.now() + 9999,
                encryptedTotpSecret: { iv: [], ciphertext: [], pbkdf2Salt: [] },
            });

            useAuthStore.getState().reset();

            const state = useAuthStore.getState();
            expect(state.totpSecret).toBeNull();
            expect(state.encryptedTotpSecret).toBeNull();
            expect(state.isUnlocked).toBe(false);
            expect(state.rememberMe).toBe(false);
            expect(state.rememberMeExpiry).toBeNull();
        });
    });
});
