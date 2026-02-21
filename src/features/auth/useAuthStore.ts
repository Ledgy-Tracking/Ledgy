import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { deriveKeyFromTotp } from '../../lib/crypto';
import { decodeSecret, verifyTotp } from '../../lib/totp';

interface AuthState {
    totpSecret: string | null; // Base32 encoded secret, persisted
    isUnlocked: boolean;
    encryptionKey: CryptoKey | null; // Volatile, never persisted
    setTotpSecret: (secret: string) => void;
    unlock: (code: string) => Promise<boolean>;
    lock: () => void;
    isRegistered: () => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            totpSecret: null,
            isUnlocked: false,
            encryptionKey: null,

            setTotpSecret: (secret: string) => {
                set({ totpSecret: secret });
            },

            unlock: async (code: string) => {
                const { totpSecret } = get();
                if (!totpSecret) return false;

                try {
                    const rawSecret = decodeSecret(totpSecret);
                    const isValid = await verifyTotp(rawSecret, code);

                    if (isValid) {
                        // Derive encryption key
                        // We use a fixed salt for the primary key derivation from TOTP
                        // In a real app, this could be more sophisticated, 
                        // but for this story, we follow the RFC/Architecture.
                        const salt = new TextEncoder().encode('ledgy-salt-v1');
                        const key = await deriveKeyFromTotp(totpSecret, salt);

                        set({
                            isUnlocked: true,
                            encryptionKey: key
                        });
                        return true;
                    }
                } catch (error) {
                    console.error('Unlock failed:', error);
                }

                return false;
            },

            lock: () => {
                set({ isUnlocked: false, encryptionKey: null });
            },

            isRegistered: () => {
                return !!get().totpSecret;
            },
        }),
        {
            name: 'ledgy-auth-storage',
            storage: createJSONStorage(() => localStorage),
            // ONLY persist the totpSecret
            partialize: (state) => ({
                totpSecret: state.totpSecret
            }),
        }
    )
);
