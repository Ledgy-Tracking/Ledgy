// Browser-native WebCrypto implementation for AES-256-GCM, HKDF, and PBKDF2
import { useErrorStore } from '../stores/useErrorStore';

/**
 * Shared HKDF salt used for deriving the vault encryption key from a TOTP secret.
 * This is a protocol constant, not a secret (RFC 5869 Section 3.1).
 * @see https://tools.ietf.org/html/rfc5869
 */
export const HKDF_SALT = 'ledgy-salt-v1';

// Cache encoder and decoder at module level to avoid redundant object creation
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Pre-encoded HKDF salt for legacy support.
 */
export const HKDF_SALT_BYTES = textEncoder.encode(HKDF_SALT);

/** Serializable form of a passphrase-encrypted TOTP secret (stored in localStorage). */
export interface EncryptedSecret {
    iv: number[];
    ciphertext: number[];
    pbkdf2Salt: number[];
}

/**
 * Generate a random 256-bit AES-GCM key.
 * Used for testing and non-TOTP-based encryption.
 */
export async function generateAESKey(): Promise<CryptoKey> {
    try {
        return await crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256,
            },
            true, // extractable for export
            ['encrypt', 'decrypt']
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate AES key';
        useErrorStore.getState().dispatchError(errorMessage, 'error');
        throw error;
    }
}

export async function deriveKeyFromTotp(totpSecretBytes: Uint8Array, salt: Uint8Array): Promise<CryptoKey> {
    try {
        // 1. Convert secret to key material
        const secretKeyMaterial = await crypto.subtle.importKey(
            "raw",
            totpSecretBytes,
            { name: "HKDF" },
            false,
            ["deriveKey"]
        );

        // 2. Derive AES-256-GCM key
        return await crypto.subtle.deriveKey(
            {
                name: "HKDF",
                hash: "SHA-256",
                salt: salt,
                info: new Uint8Array(), // Empty info array
            },
            secretKeyMaterial,
            { name: "AES-GCM", length: 256 },
            false, // extractable
            ["encrypt", "decrypt"]
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to derive key from TOTP secret';
        useErrorStore.getState().dispatchError(errorMessage, 'error');
        throw error;
    }
}

/**
 * Derives an AES-256-GCM key from a user-supplied passphrase using PBKDF2 (600 000 iterations).
 * 
 * Performance Note: PBKDF2 with 600k iterations takes ~1-3s on modern hardware.
 * Show a loading indicator during derivation for better UX.
 * 
 * Security Note: JavaScript cannot manually clear keys from memory.
 * Keys are marked non-extractable and rely on garbage collection.
 * For sensitive applications, consider using a Web Worker to isolate key material.
 * 
 * @param passphrase  Plain-text passphrase entered by the user.
 * @param salt        Random 16-byte salt that must be persisted alongside the ciphertext.
 */
export async function deriveKeyFromPassphrase(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    try {
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            textEncoder.encode(passphrase),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                hash: 'SHA-256',
                salt,
                iterations: 600_000,
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to derive key from passphrase';
        useErrorStore.getState().dispatchError(errorMessage, 'error');
        throw error;
    }
}

export async function encryptPayload(key: CryptoKey, plaintext: string): Promise<{ iv: number[], ciphertext: ArrayBuffer }> {
    try {
        const data = textEncoder.encode(plaintext);
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const ciphertext = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            key,
            data
        );

        return {
            iv: Array.from(iv),
            ciphertext,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Encryption failed';
        useErrorStore.getState().dispatchError(errorMessage, 'error');
        throw error;
    }
}

export async function decryptPayload(key: CryptoKey, iv: Uint8Array, ciphertext: ArrayBuffer): Promise<string> {
    try {
        const decrypted = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            key,
            ciphertext
        );

        return textDecoder.decode(decrypted);
    } catch (error) {
        // GCM auth tag verification failure means tampering or wrong key
        const errorMessage = error instanceof Error ? 'Decryption failed: invalid key or tampered data' : 'Decryption failed';
        useErrorStore.getState().dispatchError(errorMessage, 'error');
        throw error;
    }
}
