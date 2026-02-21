// Browser-native WebCrypto implementation for AES-256-GCM, HKDF, and PBKDF2

/**
 * Shared HKDF salt used for deriving the vault encryption key from a TOTP secret.
 * A single named constant prevents the salt value from being hardcoded in multiple places.
 */
export const HKDF_SALT = 'ledgy-salt-v1';

/** Serializable form of a passphrase-encrypted TOTP secret (stored in localStorage). */
export interface EncryptedSecret {
    iv: number[];
    ciphertext: number[];
    pbkdf2Salt: number[];
}

export async function deriveKeyFromTotp(totpSecret: string, salt: Uint8Array): Promise<CryptoKey> {
    // 1. Convert secret to key material
    const encoder = new TextEncoder();
    const secretKeyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(totpSecret),
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
}

/**
 * Derives an AES-256-GCM key from a user-supplied passphrase using PBKDF2 (100 000 iterations).
 * @param passphrase  Plain-text passphrase entered by the user.
 * @param salt        Random 16-byte salt that must be persisted alongside the ciphertext.
 */
export async function deriveKeyFromPassphrase(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            hash: 'SHA-256',
            salt,
            iterations: 100_000,
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

export async function encryptPayload(key: CryptoKey, plaintext: string): Promise<{ iv: number[], ciphertext: ArrayBuffer }> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
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
}

export async function decryptPayload(key: CryptoKey, iv: Uint8Array, ciphertext: ArrayBuffer): Promise<string> {
    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        key,
        ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}
