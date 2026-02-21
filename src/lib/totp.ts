import base32Encode from 'base32-encode';
import base32Decode from 'base32-decode';

/**
 * TOTP implementation according to RFC 6238
 */

export function generateSecret(): Uint8Array {
    const secret = new Uint8Array(20); // 160 bits
    crypto.getRandomValues(secret);
    return secret;
}

export function encodeSecret(secret: Uint8Array): string {
    return base32Encode(secret, 'RFC4648', { padding: false });
}

export function decodeSecret(encoded: string): Uint8Array {
    return new Uint8Array(base32Decode(encoded, 'RFC4648'));
}

export function generateOtpauthUri(secretEncoded: string, accountName: string, issuer: string = 'Ledgy'): string {
    const label = encodeURIComponent(`${issuer}:${accountName}`);
    const params = new URLSearchParams({
        secret: secretEncoded,
        issuer: issuer,
        algorithm: 'SHA1',
        digits: '6',
        period: '30'
    });
    return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * Verifies a TOTP code against a secret for a given time window.
 * Default is a 30-second window with 1 window step tolerance (prev/next).
 */
export async function verifyTotp(secret: Uint8Array, code: string, windowSteps: number = 1): Promise<boolean> {
    const now = Math.floor(Date.now() / 1000);
    const counter = Math.floor(now / 30);

    for (let i = -windowSteps; i <= windowSteps; i++) {
        const expectedCode = await generateHotp(secret, BigInt(counter + i));
        if (expectedCode === code) {
            return true;
        }
    }

    return false;
}

/**
 * Internal helper to generate HOTP (RFC 4226)
 */
async function generateHotp(secret: Uint8Array, counter: bigint): Promise<string> {
    // 1. Prepare counter as 8-byte big-endian buffer
    const counterBuf = new ArrayBuffer(8);
    const view = new DataView(counterBuf);
    // We only care about the lower 32 bits for reasonable timestamps, 
    // but let's do it properly for bigint.
    view.setBigUint64(0, counter, false);

    // 2. HMAC-SHA1
    const key = await crypto.subtle.importKey(
        'raw',
        secret as any,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        counterBuf
    );

    const hmacResult = new Uint8Array(signature);

    // 3. Dynamic Truncation
    const offset = hmacResult[hmacResult.length - 1] & 0xf;
    const binary =
        ((hmacResult[offset] & 0x7f) << 24) |
        ((hmacResult[offset + 1] & 0xff) << 16) |
        ((hmacResult[offset + 2] & 0xff) << 8) |
        (hmacResult[offset + 3] & 0xff);

    // 4. Modulo 10^6
    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
}
