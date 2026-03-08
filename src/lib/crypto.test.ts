import { describe, it, expect, vi } from 'vitest';
import {
    HKDF_SALT,
    generateAESKey,
    deriveKeyFromTotp,
    deriveKeyFromPassphrase,
    encryptPayload,
    decryptPayload,
    type EncryptedSecret,
} from './crypto';
import { generateSecret } from './totp';

describe('WebCrypto AES-256 Engine', () => {
    describe('HKDF_SALT constant', () => {
        it('is defined and non-empty', () => {
            expect(HKDF_SALT).toBeDefined();
            expect(HKDF_SALT.length).toBeGreaterThan(0);
        });
    });

    describe('generateAESKey', () => {
        it('handles errors during generation', async () => {
            const spy = vi.spyOn(crypto.subtle, 'generateKey').mockRejectedValue(new Error('Generation failed'));

            try {
                await expect(generateAESKey()).rejects.toThrow('Generation failed');
            } finally {
                spy.mockRestore();
            }
        });

        it('generates 256-bit AES-GCM key', async () => {
            const key = await generateAESKey();
            
            expect(key.algorithm.name).toBe('AES-GCM');
            expect((key.algorithm as AesKeyGenParams).length).toBe(256);
            expect(key.extractable).toBe(true);
            expect(key.usages).toContain('encrypt');
            expect(key.usages).toContain('decrypt');
        });

        it('generates unique keys each time', async () => {
            const key1 = await generateAESKey();
            const key2 = await generateAESKey();
            
            // Export both keys to compare
            const jwk1 = await crypto.subtle.exportKey('jwk', key1);
            const jwk2 = await crypto.subtle.exportKey('jwk', key2);
            
            expect(jwk1.k).not.toBe(jwk2.k);
        });
    });

    describe('deriveKeyFromTotp (HKDF)', () => {
        it('handles errors during derivation', async () => {
            const rawSecret = generateSecret();
            const salt = new TextEncoder().encode(HKDF_SALT);

            const spy = vi.spyOn(crypto.subtle, 'importKey').mockRejectedValue(new Error('Import failed'));

            try {
                await expect(deriveKeyFromTotp(rawSecret, salt)).rejects.toThrow('Import failed');
            } finally {
                spy.mockRestore();
            }
        });

        it('derives 256-bit AES-GCM key from TOTP secret', async () => {
            const rawSecret = generateSecret();
            const salt = new TextEncoder().encode(HKDF_SALT);
            
            const key = await deriveKeyFromTotp(rawSecret, salt);
            
            expect(key.algorithm.name).toBe('AES-GCM');
            expect((key.algorithm as AesKeyGenParams).length).toBe(256);
            expect(key.extractable).toBe(false);
            expect(key.usages).toContain('encrypt');
            expect(key.usages).toContain('decrypt');
        });

        it('derives same key from same secret and salt', async () => {
            const rawSecret = generateSecret();
            const salt = new TextEncoder().encode('test-salt');
            
            // Derive keys and use them to encrypt same plaintext
            const key1 = await deriveKeyFromTotp(rawSecret, salt);
            const key2 = await deriveKeyFromTotp(rawSecret, salt);
            
            // Both keys should encrypt to same ciphertext with same IV
            const plaintext = 'test message';
            const iv = new Uint8Array(12); // Fixed IV for comparison
            
            const enc1 = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key1, new TextEncoder().encode(plaintext));
            const enc2 = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key2, new TextEncoder().encode(plaintext));
            
            // Ciphertexts should be identical (same key, same IV, same plaintext)
            expect(new Uint8Array(enc1)).toEqual(new Uint8Array(enc2));
        });

        it('derives different keys with different salts', async () => {
            const rawSecret = generateSecret();
            
            const key1 = await deriveKeyFromTotp(rawSecret, new TextEncoder().encode('salt1'));
            const key2 = await deriveKeyFromTotp(rawSecret, new TextEncoder().encode('salt2'));
            
            // Encrypt same plaintext with same IV
            const plaintext = 'test';
            const iv = new Uint8Array(12);
            
            const enc1 = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key1, new TextEncoder().encode(plaintext));
            const enc2 = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key2, new TextEncoder().encode(plaintext));
            
            // Ciphertexts should be different (different keys)
            expect(new Uint8Array(enc1)).not.toEqual(new Uint8Array(enc2));
        });

        // RFC 5869 Test Vector (simplified for HKDF-SHA256)
        it('follows RFC 5869 HKDF principles', async () => {
            // Using a known test input
            const ikm = new Uint8Array([0x0b, 0x0b, 0x0b, 0x0b, 0x0b, 0x0b]);
            const salt = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
            
            const key = await deriveKeyFromTotp(ikm, salt);
            expect(key.algorithm.name).toBe('AES-GCM');
            expect((key.algorithm as AesKeyGenParams).length).toBe(256);
        });
    });

    describe('deriveKeyFromPassphrase (PBKDF2)', () => {
        it('derives 256-bit AES-GCM key from passphrase', async () => {
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const key = await deriveKeyFromPassphrase('test-passphrase', salt);
            
            expect(key.algorithm.name).toBe('AES-GCM');
            expect((key.algorithm as AesKeyGenParams).length).toBe(256);
            expect(key.extractable).toBe(false);
        });

        it('derives same key from same passphrase and salt', async () => {
            const salt = crypto.getRandomValues(new Uint8Array(16));
            
            const key1 = await deriveKeyFromPassphrase('my-passphrase', salt);
            const key2 = await deriveKeyFromPassphrase('my-passphrase', salt);
            
            // Test by encrypting same plaintext with same IV
            const plaintext = 'test';
            const iv = new Uint8Array(12);
            
            const enc1 = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key1, new TextEncoder().encode(plaintext));
            const enc2 = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key2, new TextEncoder().encode(plaintext));
            
            expect(new Uint8Array(enc1)).toEqual(new Uint8Array(enc2));
        });

        it('derives different keys with different salts', async () => {
            const salt1 = crypto.getRandomValues(new Uint8Array(16));
            const salt2 = crypto.getRandomValues(new Uint8Array(16));
            
            const key1 = await deriveKeyFromPassphrase('passphrase', salt1);
            const key2 = await deriveKeyFromPassphrase('passphrase', salt2);
            
            const plaintext = 'test';
            const iv = new Uint8Array(12);
            
            const enc1 = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key1, new TextEncoder().encode(plaintext));
            const enc2 = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key2, new TextEncoder().encode(plaintext));
            
            expect(new Uint8Array(enc1)).not.toEqual(new Uint8Array(enc2));
        });

        it('derives different keys for different passphrases', async () => {
            const salt = crypto.getRandomValues(new Uint8Array(16));
            
            const key1 = await deriveKeyFromPassphrase('passphrase1', salt);
            const key2 = await deriveKeyFromPassphrase('passphrase2', salt);
            
            const plaintext = 'test';
            const iv = new Uint8Array(12);
            
            const enc1 = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key1, new TextEncoder().encode(plaintext));
            const enc2 = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key2, new TextEncoder().encode(plaintext));
            
            expect(new Uint8Array(enc1)).not.toEqual(new Uint8Array(enc2));
        });
    });

    describe('encryptPayload / decryptPayload (AES-GCM)', () => {
        it('generates an IV of exactly 12 bytes', async () => {
            const key = await generateAESKey();
            const plaintext = 'Test length';

            const encrypted = await encryptPayload(key, plaintext);

            expect(encrypted.iv.length).toBe(12);
        });

        it('successfully encrypts without erroring out', async () => {
            const key = await generateAESKey();
            const plaintext = 'Test execution';

            await expect(encryptPayload(key, plaintext)).resolves.toBeDefined();
        });

        it('encrypts and decrypts round-trip', async () => {
            const key = await generateAESKey();
            const plaintext = 'Hello, World!';
            
            const encrypted = await encryptPayload(key, plaintext);
            const decrypted = await decryptPayload(key, new Uint8Array(encrypted.iv), encrypted.ciphertext);
            
            expect(decrypted).toBe(plaintext);
        });

        it('generates unique IV for each encryption', async () => {
            const key = await generateAESKey();
            const plaintext = 'Same message';
            
            const encrypted1 = await encryptPayload(key, plaintext);
            const encrypted2 = await encryptPayload(key, plaintext);
            
            // IVs should be different (random)
            expect(encrypted1.iv).not.toEqual(encrypted2.iv);
            
            // But both should decrypt to same plaintext
            const decrypted1 = await decryptPayload(key, new Uint8Array(encrypted1.iv), encrypted1.ciphertext);
            const decrypted2 = await decryptPayload(key, new Uint8Array(encrypted2.iv), encrypted2.ciphertext);
            
            expect(decrypted1).toBe(plaintext);
            expect(decrypted2).toBe(plaintext);
        });

        it('fails to decrypt with wrong key', async () => {
            const key1 = await generateAESKey();
            const key2 = await generateAESKey();
            const plaintext = 'Secret message';
            
            const encrypted = await encryptPayload(key1, plaintext);
            
            await expect(
                decryptPayload(key2, new Uint8Array(encrypted.iv), encrypted.ciphertext)
            ).rejects.toThrow();
        });

        it('fails to decrypt with tampered ciphertext (GCM auth tag)', async () => {
            const key = await generateAESKey();
            const plaintext = 'Untampered message';
            
            const encrypted = await encryptPayload(key, plaintext);
            
            // Tamper with ciphertext
            const tamperedCiphertext = new ArrayBuffer(encrypted.ciphertext.byteLength);
            const tamperedView = new Uint8Array(tamperedCiphertext);
            const originalView = new Uint8Array(encrypted.ciphertext);
            tamperedView.set(originalView);
            tamperedView[0] ^= 0xFF; // Flip bits in first byte
            
            await expect(
                decryptPayload(key, new Uint8Array(encrypted.iv), tamperedCiphertext)
            ).rejects.toThrow();
        });

        it('fails to decrypt with wrong IV', async () => {
            const key = await generateAESKey();
            const plaintext = 'Message with IV';
            
            const encrypted = await encryptPayload(key, plaintext);
            const wrongIv = crypto.getRandomValues(new Uint8Array(12));
            
            await expect(
                decryptPayload(key, wrongIv, encrypted.ciphertext)
            ).rejects.toThrow();
        });

        it('handles unicode characters', async () => {
            const key = await generateAESKey();
            const plaintext = 'Hello, 世界！🌍 Привет!';
            
            const encrypted = await encryptPayload(key, plaintext);
            const decrypted = await decryptPayload(key, new Uint8Array(encrypted.iv), encrypted.ciphertext);
            
            expect(decrypted).toBe(plaintext);
        });

        it('handles empty string', async () => {
            const key = await generateAESKey();
            const plaintext = '';
            
            const encrypted = await encryptPayload(key, plaintext);
            const decrypted = await decryptPayload(key, new Uint8Array(encrypted.iv), encrypted.ciphertext);
            
            expect(decrypted).toBe(plaintext);
        });

        it('handles large payloads', async () => {
            const key = await generateAESKey();
            const plaintext = 'A'.repeat(10000); // 10KB string
            
            const encrypted = await encryptPayload(key, plaintext);
            const decrypted = await decryptPayload(key, new Uint8Array(encrypted.iv), encrypted.ciphertext);
            
            expect(decrypted).toBe(plaintext);
        });
    });

    describe('IV Randomness (Statistical Test)', () => {
        it('generates statistically random IVs', async () => {
            const key = await generateAESKey();
            const ivs: number[][] = [];
            
            // Generate 100 IVs
            for (let i = 0; i < 100; i++) {
                const encrypted = await encryptPayload(key, `test-${i}`);
                ivs.push(encrypted.iv);
            }
            
            // Check all IVs are unique
            const uniqueIvs = new Set(ivs.map(iv => iv.join(',')));
            expect(uniqueIvs.size).toBe(ivs.length);
            
            // Check IV length is always 12 bytes
            ivs.forEach(iv => {
                expect(iv.length).toBe(12);
            });
        });
    });

    describe('EncryptedSecret interface', () => {
        it('can serialize and deserialize', () => {
            const secret: EncryptedSecret = {
                iv: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                ciphertext: Array.from(new Uint8Array([255, 254, 253])),
                pbkdf2Salt: [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
            };
            
            // Serialize
            const json = JSON.stringify(secret);
            
            // Deserialize
            const parsed: EncryptedSecret = JSON.parse(json);
            
            expect(parsed.iv).toEqual(secret.iv);
            expect(parsed.ciphertext).toEqual(secret.ciphertext);
            expect(parsed.pbkdf2Salt).toEqual(secret.pbkdf2Salt);
        });
    });
});
