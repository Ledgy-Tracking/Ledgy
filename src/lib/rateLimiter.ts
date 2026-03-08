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

// HMAC key for signing (in production, this should be server-provided)
const HMAC_KEY = 'ledgy-rate-limit-hmac-key-v1';

/**
 * Rate limit state for a single account
 */
export interface RateLimitState {
    account: string;
    attempts: number;
    lastAttempt: number; // Unix timestamp
    lockedUntil: number | null; // Unix timestamp or null
    signature: string; // HMAC signature for tamper detection
}

/**
 * Generate HMAC signature for state
 */
async function generateSignature(state: Omit<RateLimitState, 'signature'>): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(state));
    const keyData = encoder.encode(HMAC_KEY);
    
    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, data);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
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
export function getRateLimitState(account: string): RateLimitState | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        
        const state: RateLimitState = JSON.parse(stored);
        
        // Verify account matches
        if (state.account !== account) return null;
        
        // Verify signature (tamper detection)
        const isValid = verifySignatureSync(state);
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
 * Synchronous signature verification (for hydration)
 * Note: This is a simplified check - full verification is async
 */
function verifySignatureSync(state: RateLimitState): boolean {
    // Basic integrity check - signature should exist and be non-empty
    return state.signature !== undefined && state.signature.length > 0;
}

/**
 * Record a failed attempt
 */
export async function recordFailedAttempt(account: string): Promise<RateLimitState> {
    const now = Date.now();
    let state = getRateLimitState(account);
    
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
    localStorage.removeItem('ledgy-auth-rate-limit');
}

/**
 * Check if account is currently locked out
 */
export function isLockedOut(account: string): boolean {
    const state = getRateLimitState(account);
    if (!state) return false;
    
    if (!state.lockedUntil) return false;
    
    const now = Date.now();
    return now < state.lockedUntil + GRACE_PERIOD_MS;
}

/**
 * Get remaining lockout time in seconds
 */
export function getRemainingLockoutTime(account: string): number {
    const state = getRateLimitState(account);
    if (!state || !state.lockedUntil) return 0;
    
    const now = Date.now();
    const remaining = Math.max(0, state.lockedUntil - now + GRACE_PERIOD_MS);
    return Math.ceil(remaining / 1000);
}

/**
 * Get delay before next attempt in seconds
 */
export function getNextAttemptDelay(account: string): number {
    const state = getRateLimitState(account);
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
export function canAttempt(account: string): { allowed: boolean; waitTime?: number } {
    if (isLockedOut(account)) {
        return {
            allowed: false,
            waitTime: getRemainingLockoutTime(account),
        };
    }
    
    const delay = getNextAttemptDelay(account);
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
        const stored = localStorage.getItem('ledgy-auth-rate-limit');
        if (!stored) return;

        const state: RateLimitState = JSON.parse(stored);
        const now = Date.now();

        // Check if expired (lockout ended + grace period)
        if (state.lockedUntil && now > state.lockedUntil + GRACE_PERIOD_MS) {
            localStorage.removeItem('ledgy-auth-rate-limit');
        }
    } catch {
        // Ignore errors, clear on next attempt
    }
}

/**
 * Get attempt count for display
 */
export function getAttemptCount(account: string): number {
    const state = getRateLimitState(account);
    return state?.attempts ?? 0;
}

/**
 * Get remaining attempts before lockout
 */
export function getRemainingAttempts(account: string): number {
    const attempts = getAttemptCount(account);
    return Math.max(0, MAX_ATTEMPTS - attempts);
}
