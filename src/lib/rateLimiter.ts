/**
 * Rate Limiter for Authentication Attempts
 * 
 * Implements exponential backoff and lockout after max failed attempts.
 * Uses HMAC signature to prevent tampering with localStorage state.
 * 
 * Security Note: This is CLIENT-SIDE rate limiting only.
 * It's a deterrent, not true security. Server-side rate limiting
 * is required for production deployments.
 */

// Constants
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const BASE_DELAY_MS = 1000; // 1 second
const MAX_DELAY_MS = 30000; // 30 seconds cap
const GRACE_PERIOD_MS = 5000; // 5 seconds for clock skew
const STORAGE_KEY = 'ledgy-auth-rate-limit';
const HMAC_KEY_STORAGE_KEY = 'ledgy-rate-limit-hmac-key';

/**
 * Get or generate the HMAC key for signing rate limit state.
 * The key is stored in localStorage to persist across sessions,
 * but is unique per client installation.
 */
function getOrGenerateHMACKey(): string {
    let key = localStorage.getItem(HMAC_KEY_STORAGE_KEY);
    if (!key) {
        // Generate a random 256-bit key (32 bytes)
        const bytes = crypto.getRandomValues(new Uint8Array(32));
        key = btoa(String.fromCharCode(...bytes));
        localStorage.setItem(HMAC_KEY_STORAGE_KEY, key);
    }
    return key;
}

// Cache TextEncoder and CryptoKey at module level to avoid redundant
// instantiation and computationally expensive WebCrypto API overhead
// on every signature generation.
const encoder = new TextEncoder();
let hmacCryptoKey: CryptoKey | null = null;

/**
 * Generate HMAC signature for state
 */
async function generateSignature(state: Omit<RateLimitState, 'signature'>): Promise<string> {
    const data = encoder.encode(JSON.stringify(state));

    const hmacKey = getOrGenerateHMACKey();
    const keyData = new Uint8Array(atob(hmacKey).split('').map(c => c.charCodeAt(0)));
    
    if (!hmacCryptoKey) {
        hmacCryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
    }
    
    const signature = await crypto.subtle.sign('HMAC', hmacCryptoKey, data);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Verify HMAC signature for state
 */
async function verifySignature(state: RateLimitState): Promise<boolean> {
    const { signature, ...unsignedState } = state;
    const expectedSignature = await generateSignature(unsignedState);
    return signature === expectedSignature;
}

/**
 * Calculate delay based on attempt number (exponential backoff)
 * Formula: delay = min(BASE_DELAY * 2^(attempts-1), MAX_DELAY)
 */
export function calculateDelay(attempts: number): number {
    if (attempts <= 0) return 0;
    if (attempts >= MAX_ATTEMPTS) return LOCKOUT_DURATION_MS;
    
    const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempts - 1), MAX_DELAY_MS);
    return delay;
}

/**
 * Get current rate limit state for an account
 */
export async function getRateLimitState(account: string): Promise<RateLimitState | null> {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        
        const state: RateLimitState = JSON.parse(stored);
        
        // Verify account matches
        if (state.account !== account) return null;
        
        // Verify signature (tamper detection)
        const isValid = await verifySignature(state);
        if (!isValid) {
            console.warn('Rate limit state tampered, resetting');
            return null;
        }
        
        // Check if lockout has expired
        const now = Date.now();
        if (state.lockedUntil && now > state.lockedUntil + GRACE_PERIOD_MS) {
            // Lockout expired, reset
            resetRateLimit(account);
            return null;
        }
        
        return state;
    } catch {
        return null;
    }
}

/**
 * Record a failed attempt
 */
export async function recordFailedAttempt(account: string): Promise<RateLimitState> {
    const now = Date.now();
    let state = await getRateLimitState(account);
    
    if (!state) {
        // First attempt
        state = {
            account,
            attempts: 1,
            lastAttempt: now,
            lockedUntil: null,
            signature: '',
        };
    } else if (state.lockedUntil) {
        // Already locked, extend lockout
        state.lockedUntil = now + LOCKOUT_DURATION_MS;
        state.attempts++;
    } else {
        // Increment attempts
        state.attempts++;
        state.lastAttempt = now;
        
        // Check if should lock out
        if (state.attempts >= MAX_ATTEMPTS) {
            state.lockedUntil = now + LOCKOUT_DURATION_MS;
        }
    }
    
    // Generate signature
    const { signature, ...unsignedState } = state;
    state.signature = await generateSignature(unsignedState);
    
    // Persist
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    
    return state;
}

/**
 * Reset rate limit on successful authentication
 */
export function resetRateLimit(_account: string): void {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if account is currently locked out
 */
export async function isLockedOut(account: string): Promise<boolean> {
    const state = await getRateLimitState(account);
    if (!state) return false;
    
    if (!state.lockedUntil) return false;
    
    const now = Date.now();
    return now < state.lockedUntil + GRACE_PERIOD_MS;
}

/**
 * Get remaining lockout time in seconds
 */
export async function getRemainingLockoutTime(account: string): Promise<number> {
    const state = await getRateLimitState(account);
    if (!state || !state.lockedUntil) return 0;
    
    const now = Date.now();
    const remaining = Math.max(0, state.lockedUntil - now + GRACE_PERIOD_MS);
    return Math.ceil(remaining / 1000);
}

/**
 * Get delay before next attempt in seconds
 */
export async function getNextAttemptDelay(account: string): Promise<number> {
    const state = await getRateLimitState(account);
    if (!state) return 0;
    
    if (state.lockedUntil) {
        return getRemainingLockoutTime(account);
    }
    
    const delay = calculateDelay(state.attempts);
    const elapsed = Date.now() - state.lastAttempt;
    const remaining = Math.max(0, delay - elapsed);
    
    return Math.ceil(remaining / 1000);
}

/**
 * Check if an attempt is allowed
 */
export async function canAttempt(account: string): Promise<{ allowed: boolean; waitTime?: number }> {
    if (await isLockedOut(account)) {
        return {
            allowed: false,
            waitTime: await getRemainingLockoutTime(account),
        };
    }
    
    const delay = await getNextAttemptDelay(account);
    if (delay > 0) {
        return {
            allowed: false,
            waitTime: delay,
        };
    }
    
    return { allowed: true };
}

/**
 * Clean up expired rate limit entries
 * Should be called on app init
 */
export function cleanupExpiredEntries(): void {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return;

        const state: RateLimitState = JSON.parse(stored);
        const now = Date.now();

        // Check if expired (lockout ended + grace period)
        if (state.lockedUntil && now > state.lockedUntil + GRACE_PERIOD_MS) {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // Ignore errors, clear on next attempt
    }
}

/**
 * Get attempt count for display
 */
export async function getAttemptCount(account: string): Promise<number> {
    const state = await getRateLimitState(account);
    return state?.attempts ?? 0;
}

/**
 * Get remaining attempts before lockout
 */
export async function getRemainingAttempts(account: string): Promise<number> {
    const attempts = await getAttemptCount(account);
    return Math.max(0, MAX_ATTEMPTS - attempts);
}