import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateSecret, encodeSecret, decodeSecret, verifyTotp, generateOtpauthUri } from './totp';

describe('TOTP Library', () => {
    // RFC 4226 Test vectors
    // Secret: "12345678901234567890" (ASCII)
    const rfcSecret = new TextEncoder().encode('12345678901234567890');

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('generates a 160-bit secret', () => {
        const secret = generateSecret();
        expect(secret).toBeInstanceOf(Uint8Array);
        expect(secret.length).toBe(20);
    });

    it('encodes and decodes secret correctly', () => {
        const secret = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21]); // "Hello!"
        const encoded = encodeSecret(secret);
        // Base32 of "Hello!" is JBSWY3DPEE
        expect(encoded).toBe('JBSWY3DPEE');

        const decoded = decodeSecret(encoded);
        expect(decoded).toEqual(secret);
    });

    it('generates correct otpauth URI', () => {
        const encodedSecret = 'JBSWY3DPEE';
        const uri = generateOtpauthUri(encodedSecret, 'james@example.com', 'Ledgy');
        expect(uri).toBe('otpauth://totp/Ledgy%3Ajames%40example.com?secret=JBSWY3DPEE&issuer=Ledgy&algorithm=SHA1&digits=6&period=30');
    });

    it('verifies TOTP codes based on RFC 4226 / 6238 expectations', async () => {
        // T = floor(timestamp / 30)
        // If Counter = 0, T = 0
        // RFC 4226 Counter 0 -> 755224

        vi.setSystemTime(0); // T = 0
        const isValid = await verifyTotp(rfcSecret, '755224', 0);
        expect(isValid).toBe(true);

        // RFC 4226 Counter 1 -> 287082
        vi.setSystemTime(30000); // T = 1
        const isValid2 = await verifyTotp(rfcSecret, '287082', 0);
        expect(isValid2).toBe(true);
    });

    it('handles window tolerance correctly', async () => {
        vi.setSystemTime(30000); // T = 1, current code is 287082

        // Previous code (T=0) is 755224
        // With windowSteps = 1, it should be valid
        const isValidPrev = await verifyTotp(rfcSecret, '755224', 1);
        expect(isValidPrev).toBe(true);

        // Next code (T=2)
        // RFC 4226 Counter 2 -> 359152
        const isValidNext = await verifyTotp(rfcSecret, '359152', 1);
        expect(isValidNext).toBe(true);

        // Far code (T=3) should be invalid
        const isValidFar = await verifyTotp(rfcSecret, '969429', 1); // Counter 3 -> 969429
        expect(isValidFar).toBe(false);
    });
});
