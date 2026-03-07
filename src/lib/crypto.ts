// Browser-native WebCrypto implementation for AES-256-GCM and HKDF

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
