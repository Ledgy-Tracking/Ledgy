import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
    deriveKeyFromTotp,
    deriveKeyFromPassphrase,
    encryptPayload,
    decryptPayload,
    HKDF_SALT_BYTES,
    EncryptedSecret,
} from '../../lib/crypto';
import { decodeSecret, encodeSecret, verifyTOTP } from '../../lib/totp';
import {
    canAttempt,
    recordFailedAttempt,
    resetRateLimit,
    getRemainingLockoutTime,
    cleanupExpiredEntries,
} from '../../lib/rateLimiter';

// ---------------------------------------------------------------------------
// Session expiry options (shown as a dropdown in the unlock UI)
// ---------------------------------------------------------------------------

export type RememberMeExpiry = '15m' | '1h' | '8h' | '1d' | '7d' | '30d' | 'never';

export const DEFAULT_EXPIRY: RememberMeExpiry = '1d';

export const EXPIRY_OPTIONS: { label: string; value: RememberMeExpiry; ms: number | null }[] = [
    { label: '15 minutes', value: '15m', ms: 15 * 60 * 1000 },
    { label: '1 hour', value: '1h', ms: 60 * 60 * 1000 },
    { label: '8 hours', value: '8h', ms: 8 * 60 * 60 * 1000 },
    { label: '1 day', value: '1d', ms: 24 * 60 * 60 * 1000 },
    { label: '7 days', value: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
    { label: '30 days', value: '30d', ms: 30 * 24 * 60 * 60 * 1000 },
    { label: 'Never', value: 'never', ms: null },
];

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

interface AuthState {
    // ----- Persisted -----
    /** Plaintext TOTP secret. Cleared when passphrase-based remember-me is active. */
    totpSecret: string | null;
    /** Passphrase-encrypted TOTP secret. Set when the user enables remember-me with a passphrase. */
    encryptedTotpSecret: EncryptedSecret | null;
    /** Whether this session should be persisted across app restarts. */
    rememberMe: boolean;
    /** Unix-ms timestamp after which the remembered session expires; null = never. */
    rememberMeExpiry: number | null;
    /** The original expiry duration in ms chosen at unlock time; used by unlockWithPassphrase to issue a fresh expiry. null = never. */
    rememberMeExpiryMs: number | null;
    /** User-specific HKDF salt (Base32 encoded). If missing, uses legacy HKDF_SALT. */
    salt: string | null;

    // ----- Volatile (never persisted) -----
    isUnlocked: boolean;
    encryptionKey: CryptoKey | null;
    /** True when app starts with a passphrase-protected secret — UnlockPage shows passphrase prompt. */
    needsPassphrase: boolean;
    // Zustand store topology (Story 1-3)
    isLoading: boolean;
    error: string | null;

    // ----- Actions -----
    setRememberMe: (val: boolean) => void;
    /**
     * Verify TOTP code and unlock the vault.
     * @param code       6-digit TOTP code
     * @param remember   Persist session across restarts
     * @param passphrase Optional passphrase to encrypt the stored secret at rest
     * @param expiryMs   Session duration in ms (null = never expires)
     */
    unlock: (code: string, remember: boolean, passphrase?: string, expiryMs?: number | null) => Promise<boolean>;
    /** Unlock the vault using a previously set passphrase (called when needsPassphrase = true). */
    unlockWithPassphrase: (passphrase: string) => Promise<boolean>;
    verifyAndRegister: (secret: string, code: string, remember: boolean, passphrase?: string, expiryMs?: number | null) => Promise<boolean>;
    /** Lock the vault — preserves rememberMe preference so the next unlock can restore it. */
    lock: () => Promise<void>;
    /** Hard reset: clears all auth state and persisted data. */
    reset: () => void;
    /** Called on app start: auto-unlock remembered sessions or flag that passphrase is needed. */
    initSession: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            totpSecret: null,
            encryptedTotpSecret: null,
            isUnlocked: false,
            encryptionKey: null,
            rememberMe: false,
            rememberMeExpiry: null,
            rememberMeExpiryMs: null,
            salt: null,
            needsPassphrase: false,
            // Zustand store topology (Story 1-3)
            isLoading: false,
            error: null,

            setRememberMe: (val: boolean) => set({ rememberMe: val }),

            initSession: async () => {
                // Clean up expired rate limit entries
                cleanupExpiredEntries();

                const {
                    rememberMe,
                    totpSecret,
                    encryptedTotpSecret,
                    encryptionKey,
                    rememberMeExpiry,
                    salt,
                } = get();

                // Step 1: Check session expiry
                if (rememberMeExpiry !== null && Date.now() > rememberMeExpiry) {
                    // Session expired — force re-authentication but retain the secrets so the user is not orphaned
                    set({
                        isUnlocked: false,
                        encryptionKey: null,
                        rememberMeExpiry: null,
                    });
                    // Note: We don't change `needsPassphrase` or clear secrets. The user either needs to enter
                    // TOTP again (if plain session) or passphrase (if passphrase session) on the next unlock attempt.
                    return;
                }

                // Step 2: Passphrase-protected remember-me — can't auto-unlock, prompt instead
                if (rememberMe && encryptedTotpSecret && !totpSecret) {
                    set({ needsPassphrase: true });
                    return;
                }

                // Step 3: Legacy Plain remember-me — no longer auto-unlock.
                // Force user to UnlockPage to set a passphrase for encryption.
                if (rememberMe && totpSecret && !encryptionKey && !encryptedTotpSecret) {
                    return;
                }
            },

            unlock: async (
                code: string,
                remember: boolean = false,
                passphrase?: string,
                expiryMs?: number | null,
            ) => {
                set({ isLoading: true, error: null });
                const { totpSecret, salt } = get();
                if (!totpSecret) {
                    if (import.meta.env.DEV) {
                        console.warn('unlock() called but totpSecret is null — a passphrase session may be active');
                    }
                    set({ isLoading: false, error: 'No TOTP secret found. Please complete setup first.' });
                    import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                        useErrorStore.getState().dispatchError('No TOTP secret found', 'error');
                    });
                    return false;
                }

                // Check rate limit before attempting unlock
                const rateLimit = canAttempt('default-account');
                if (!rateLimit.allowed && rateLimit.waitTime) {
                    const minutes = Math.ceil(rateLimit.waitTime / 60);
                    const errorMessage = `Too many failed attempts. Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`;
                    set({ isLoading: false, error: errorMessage });
                    import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                        useErrorStore.getState().dispatchError(errorMessage, 'error');
                    });
                    return false;
                }

                try {
                    const rawSecret = decodeSecret(totpSecret);
                    const isValid = await verifyTOTP(rawSecret, code);

                    if (isValid) {
                        // Reset rate limit on success
                        resetRateLimit('default-account');
                        const hkdfSalt = salt ? decodeSecret(salt) : HKDF_SALT_BYTES;
                        const key = await deriveKeyFromTotp(rawSecret, hkdfSalt);

                        const expiryTimestamp =
                            remember && expiryMs != null ? Date.now() + expiryMs : null;
                        const storedExpiryMs = remember && expiryMs != null ? expiryMs : null;

                        if (remember && passphrase) {
                            // Encrypt the TOTP secret with a PBKDF2-derived key so it is
                            // never stored in plaintext when "Remember Me + passphrase" is active.
                            const pbkdf2Salt = crypto.getRandomValues(new Uint8Array(16));
                            const passphraseKey = await deriveKeyFromPassphrase(passphrase, pbkdf2Salt);
                            const { iv, ciphertext } = await encryptPayload(passphraseKey, totpSecret);
                            const encrypted: EncryptedSecret = {
                                iv,
                                ciphertext: Array.from(new Uint8Array(ciphertext)),
                                pbkdf2Salt: Array.from(pbkdf2Salt),
                            };
                            set({
                                isUnlocked: true,
                                encryptionKey: key,
                                rememberMe: remember,
                                encryptedTotpSecret: encrypted,
                                totpSecret: null, // Remove plaintext; encrypted version takes over
                                rememberMeExpiry: expiryTimestamp,
                                rememberMeExpiryMs: storedExpiryMs,
                                needsPassphrase: false,
                                isLoading: false,
                                error: null,
                            });
                        } else {
                            set({
                                isUnlocked: true,
                                encryptionKey: key,
                                rememberMe: remember && !!passphrase,
                                encryptedTotpSecret: null,
                                rememberMeExpiry: expiryTimestamp,
                                rememberMeExpiryMs: storedExpiryMs,
                                needsPassphrase: false,
                                isLoading: false,
                                error: null,
                            });
                        }
                        return true;
                    }

                    // Failed attempt - record for rate limiting
                    await recordFailedAttempt('default-account');
                    const remaining = getRemainingLockoutTime('default-account');

                    let errorMessage = 'Invalid TOTP code. Please try again.';
                    if (remaining > 0) {
                        const minutes = Math.ceil(remaining / 60);
                        errorMessage = `Too many failed attempts. Account locked for ${minutes} minute${minutes > 1 ? 's' : ''}.`;
                    }

                    set({ isLoading: false, error: errorMessage });
                    import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                        useErrorStore.getState().dispatchError(errorMessage, 'error');
                    });
                    return false;
                } catch (error) {
                    if (import.meta.env.DEV) {
                        console.error('Unlock failed:', error);
                    }
                    const errorMessage = error instanceof Error ? error.message : 'Invalid TOTP code';
                    set({ isLoading: false, error: errorMessage });
                    import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                        useErrorStore.getState().dispatchError(errorMessage, 'error');
                    });
                    return false;
                }

                return false;
            },

            unlockWithPassphrase: async (passphrase: string) => {
                const { encryptedTotpSecret, rememberMeExpiryMs, salt } = get();
                if (!encryptedTotpSecret) return false;

                try {
                    const pbkdf2Salt = new Uint8Array(encryptedTotpSecret.pbkdf2Salt);
                    const passphraseKey = await deriveKeyFromPassphrase(passphrase, pbkdf2Salt);

                    const iv = new Uint8Array(encryptedTotpSecret.iv);
                    const ciphertext = new Uint8Array(encryptedTotpSecret.ciphertext).buffer;
                    const totpSecret = await decryptPayload(passphraseKey, iv, ciphertext);

                    const hkdfSalt = salt ? decodeSecret(salt) : HKDF_SALT_BYTES;
                    const key = await deriveKeyFromTotp(decodeSecret(totpSecret), hkdfSalt);

                    // Compute a fresh expiry using the stored duration so the session
                    // doesn't become eternal after the previous one expired.
                    const newExpiry = rememberMeExpiryMs !== null ? Date.now() + rememberMeExpiryMs : null;
                    set({
                        isUnlocked: true,
                        encryptionKey: key,
                        // Restore secret in volatile memory so TOTP verification still works
                        // within this session; partialize excludes it from storage when
                        // encryptedTotpSecret is present (see partialize below).
                        totpSecret,
                        needsPassphrase: false,
                        rememberMeExpiry: newExpiry,
                    });
                    return true;
                } catch (err) {
                    if (import.meta.env.DEV) {
                        console.error('Passphrase unlock failed:', err);
                    }
                    return false;
                }
            },

            verifyAndRegister: async (
                secret: string,
                code: string,
                remember: boolean = false,
                passphrase?: string,
                expiryMs?: number | null
            ) => {
                try {
                    const rawSecret = decodeSecret(secret);
                    const isValid = await verifyTOTP(rawSecret, code);

                    if (isValid) {
                        const saltBytes = crypto.getRandomValues(new Uint8Array(16));
                        const saltBase32 = encodeSecret(saltBytes);
                        const key = await deriveKeyFromTotp(rawSecret, saltBytes);

                        const expiryTimestamp =
                            remember && expiryMs != null ? Date.now() + expiryMs : null;
                        const storedExpiryMs = remember && expiryMs != null ? expiryMs : null;

                        if (remember && passphrase) {
                            const pbkdf2Salt = crypto.getRandomValues(new Uint8Array(16));
                            const passphraseKey = await deriveKeyFromPassphrase(passphrase, pbkdf2Salt);
                            const { iv, ciphertext } = await encryptPayload(passphraseKey, secret);
                            const encrypted: EncryptedSecret = {
                                iv,
                                ciphertext: Array.from(new Uint8Array(ciphertext)),
                                pbkdf2Salt: Array.from(pbkdf2Salt),
                            };
                            set({
                                totpSecret: null,
                                encryptedTotpSecret: encrypted,
                                isUnlocked: true,
                                encryptionKey: key,
                                rememberMe: remember,
                                salt: saltBase32,
                                rememberMeExpiry: expiryTimestamp,
                                rememberMeExpiryMs: storedExpiryMs,
                                needsPassphrase: false,
                            });
                        } else {
                            set({
                                totpSecret: secret,
                                encryptedTotpSecret: null,
                                isUnlocked: true,
                                encryptionKey: key,
                                rememberMe: remember && !!passphrase,
                                rememberMeExpiry: expiryTimestamp,
                                rememberMeExpiryMs: storedExpiryMs,
                                needsPassphrase: false,
                            });
                        }
                        return true;
                    }
                } catch (error) {
                    if (import.meta.env.DEV) {
                        console.error('Registration failed:', error);
                    }
                }
                return false;
            },

            lock: async () => {
                // Preserve rememberMe preference so the user's choice persists across locks.
                // Only clear the active session credentials.
                set({ isUnlocked: false, encryptionKey: null });

                // Memory Sweep: Clear the global profile registry and dependent stores
                const { useProfileStore } = await import('../profiles/useProfileStore');
                useProfileStore.getState().clearActiveProfile();
                useProfileStore.setState({ profiles: [] });
            },

            reset: () => {
                set({
                    totpSecret: null,
                    encryptedTotpSecret: null,
                    isUnlocked: false,
                    encryptionKey: null,
                    rememberMe: false,
                    rememberMeExpiry: null,
                    rememberMeExpiryMs: null,
                    salt: null,
                    needsPassphrase: false,
                });
            },
        }),
        {
            name: 'ledgy-auth-storage',
            storage: createJSONStorage(() => localStorage),
            /**
             * Only persist non-sensitive or encrypted session state.
             * Plaintext totpSecret is never persisted to mitigate local storage exposure.
             */
            partialize: (state) => ({
                encryptedTotpSecret: state.encryptedTotpSecret,
                rememberMe: state.rememberMe,
                rememberMeExpiry: state.rememberMeExpiry,
                rememberMeExpiryMs: state.rememberMeExpiryMs,
                salt: state.salt,
            } as AuthState),
        }
    )
);

// NOTE: initSession() is called in main.tsx and awaited before the app renders.
// This prevents the TOTP-screen flash for passphrase-protected sessions on cold start.

export const useIsRegistered = () => {
    return useAuthStore(state => !!(state.totpSecret || state.encryptedTotpSecret));
};
