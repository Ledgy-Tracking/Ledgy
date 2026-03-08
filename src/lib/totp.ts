/**
 * TOTP (Time-based One-Time Password) Implementation
 * RFC 6238 compliant TOTP algorithm
 * 
 * Security Notes:
 * - Uses WebCrypto for secure random generation
 * - Constant-time comparison prevents timing attacks
 * - 20-byte (160-bit) secrets minimum
 */

/**
 * Base32 encoding table
 */
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a cryptographically secure random secret
 * @returns Raw bytes (Uint8Array) for backward compatibility
 */
export function generateSecret(): Uint8Array {
    const secretBytes = new Uint8Array(20); // 160 bits
    crypto.getRandomValues(secretBytes);
    return secretBytes;
}

/**
 * Generate a cryptographically secure random secret with base32 encoding
 * @returns Object with raw bytes and base32 encoded string
 */
export function generateSecretWithEncoding(): { raw: Uint8Array; base32: string } {
    const secretBytes = generateSecret();
    const base32 = toBase32(secretBytes);
    return { raw: secretBytes, base32 };
}

/**
 * Encode raw bytes as base32 string (alias for toBase32)
 */
export function encodeSecret(bytes: Uint8Array): string {
    return toBase32(bytes);
}

/**
 * Decode base32 string to raw bytes (alias for fromBase32)
 */
export function decodeSecret(base32: string): Uint8Array {
    return fromBase32(base32);
}

/**
 * Convert bytes to base32 string
 */
function toBase32(bytes: Uint8Array): string {
    let bits = 0;
    let value = 0;
    let output = '';
    
    for (const byte of bytes) {
        value = (value << 8) | byte;
        bits += 8;
        
        while (bits >= 5) {
            output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    
    if (bits > 0) {
        output += BASE32_CHARS[(value << (5 - bits)) & 31];
    }
    
    return output;
}

/**
 * Convert base32 string back to bytes
 */
export function fromBase32(base32: string): Uint8Array {
    const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
    const bytes = new Uint8Array(Math.ceil(clean.length * 5 / 8));
    
    let bits = 0;
    let value = 0;
    let index = 0;
    
    for (const char of clean) {
        const val = BASE32_CHARS.indexOf(char);
        if (val === -1) continue;
        
        value = (value << 5) | val;
        bits += 5;
        
        if (bits >= 8) {
            bytes[index++] = (value >>> (bits - 8)) & 0xFF;
            bits -= 8;
        }
    }
    
    return bytes;
}

/**
 * Generate TOTP URI for QR code
 * @param secret - Base32 encoded secret
 * @param accountName - User's account name (email)
 * @param issuer - Service name (e.g., "Ledgy")
 */
export function generateTOTPURI(secret: string, accountName: string, issuer: string = 'Ledgy', algorithm: 'SHA1' | 'SHA256' | 'SHA512' = 'SHA256'): string {
    const encodedAccount = encodeURIComponent(accountName);
    const encodedIssuer = encodeURIComponent(issuer);
    
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=${algorithm}&digits=6&period=30`;
}

// Alias for backward compatibility
export const generateOtpauthUri = generateTOTPURI;

/**
 * HMAC-SHA implementation using WebCrypto API
 */
async function hmacSha(key: Uint8Array, data: Uint8Array, algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512' = 'SHA-1'): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: algorithm },
        false,
        ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
    return new Uint8Array(signature);
}

/**
 * Generate HOTP code (HMAC-based One-Time Password)
 * RFC 4226 compliant
 */
async function hotp(secret: Uint8Array, counter: number, algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512' = 'SHA-1'): Promise<string> {
    // Convert counter to 8-byte big-endian array
    const counterBytes = new Uint8Array(8);
    for (let i = 7; i >= 0; i--) {
        counterBytes[i] = counter & 0xFF;
        counter = Math.floor(counter / 256);
    }
    
    // HMAC-SHA hash
    const hash = await hmacSha(secret, counterBytes, algorithm);
    
    // Dynamic truncation (RFC 4226 Section 5.4)
    const offset = hash[hash.length - 1] & 0x0F;
    const binary = ((hash[offset] & 0x7F) << 24) |
                   ((hash[offset + 1] & 0xFF) << 16) |
                   ((hash[offset + 2] & 0xFF) << 8) |
                   (hash[offset + 3] & 0xFF);
    
    // Generate 6-digit code
    const code = (binary % 1000000).toString().padStart(6, '0');
    return code;
}

/**
 * Generate TOTP code (Time-based One-Time Password)
 * RFC 6238 compliant
 * @param secret - Base32 encoded secret or raw bytes
 * @param timeStep - Optional time step (defaults to current time)
 * @param algorithm - Hash algorithm (defaults to SHA-1 for backwards compatibility in standalone calls)
 */
export async function generateTOTP(secret: string | Uint8Array, timeStep?: number, algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512' = 'SHA-1'): Promise<string> {
    const secretBytes = typeof secret === 'string' ? fromBase32(secret) : secret;
    const step = timeStep ?? Math.floor(Date.now() / 1000 / 30);
    
    return await hotp(secretBytes, step, algorithm);
}

/**
 * Verify TOTP code with time window tolerance
 * @param secret - Base32 encoded secret or raw bytes
 * @param code - User-provided 6-digit code
 * @param window - Number of time steps to check (default: 1, meaning ±1 step)
 */
export async function verifyTOTP(
    secret: string | Uint8Array,
    code: string,
    window: number = 1
): Promise<boolean> {
    const secretBytes = typeof secret === 'string' ? fromBase32(secret) : secret;
    const currentStep = Math.floor(Date.now() / 1000 / 30);
    
    const algorithms: ('SHA-1' | 'SHA-256')[] = ['SHA-1', 'SHA-256'];

    // Prioritize checking the current time step (0) first,
    // as it is the most likely to be correct. Then check offsets (-1, 1, -2, 2...)
    const stepsToCheck = [0];
    for (let i = 1; i <= window; i++) {
        stepsToCheck.push(-i, i);
    }

    for (const stepOffset of stepsToCheck) {
        for (const alg of algorithms) {
            const expectedCode = await generateTOTP(secretBytes, currentStep + stepOffset, alg);

            // Constant-time comparison to prevent timing attacks
            if (constantTimeCompare(code, expectedCode)) {
                return true;
            }
        }
    }
    
    return false;
}

// Alias for backward compatibility
export const verifyTotp = verifyTOTP;

/**
 * Constant-time string comparison to prevent timing attacks
 * Security critical for TOTP verification
 */
export function constantTimeCompare(a: string, b: string): boolean {
    // First check length (not constant time, but length is always 6 for TOTP)
    if (a.length !== b.length) {
        return false;
    }
    
    // Convert to char codes and compare with accumulator
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
}

/**
 * Get seconds until next TOTP code
 */
export function getSecondsUntilNextCode(): number {
    const now = Math.floor(Date.now() / 1000);
    return 30 - (now % 30);
}

/**
 * Generate backup codes for account recovery
 * @param count - Number of backup codes to generate (default: 10)
 */
export function generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    const bytes = new Uint8Array(count * 4);
    crypto.getRandomValues(bytes);
    
    for (let i = 0; i < count; i++) {
        // Generate 8-digit backup code
        const code = ((bytes[i * 4] << 24) | (bytes[i * 4 + 1] << 16) | 
                      (bytes[i * 4 + 2] << 8) | bytes[i * 4 + 3]) >>> 0;
        codes.push((code % 100000000).toString().padStart(8, '0'));
    }
    
    return codes;
}
