import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    calculateDelay,
    getRateLimitState,
    recordFailedAttempt,
    resetRateLimit,
    isLockedOut,
    getRemainingLockoutTime,
    canAttempt,
    cleanupExpiredEntries,
    getAttemptCount,
    getRemainingAttempts,
} from './rateLimiter';

describe('Rate Limiter', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        localStorage.clear();
        vi.useRealTimers();
    });

    describe('calculateDelay', () => {
        it('returns 0 for 0 attempts', () => {
            expect(calculateDelay(0)).toBe(0);
        });

        it('calculates exponential backoff correctly', () => {
            expect(calculateDelay(1)).toBe(1000); // 1s
            expect(calculateDelay(2)).toBe(2000); // 2s
            expect(calculateDelay(3)).toBe(4000); // 4s
            expect(calculateDelay(4)).toBe(8000); // 8s
        });

        it('caps delay at MAX_DELAY', () => {
            expect(calculateDelay(4)).toBe(8000); // 8s
            expect(calculateDelay(5)).toBe(15 * 60 * 1000); // Lockout at max attempts
        });

        it('returns lockout duration for max attempts', () => {
            expect(calculateDelay(5)).toBe(15 * 60 * 1000); // 15 minutes
        });
    });

    describe('recordFailedAttempt', () => {
        it('creates state on first attempt', async () => {
            const state = await recordFailedAttempt('test-account');
            
            expect(state.account).toBe('test-account');
            expect(state.attempts).toBe(1);
            expect(state.lockedUntil).toBeNull();
            expect(state.signature).toBeDefined();
        });

        it('increments attempts on subsequent failures', async () => {
            await recordFailedAttempt('test-account');
            const state2 = await recordFailedAttempt('test-account');
            
            expect(state2.attempts).toBe(2);
        });

        it('locks out after max attempts', async () => {
            for (let i = 0; i < 5; i++) {
                await recordFailedAttempt('test-account');
            }
            
            const state = await recordFailedAttempt('test-account');
            expect(state.lockedUntil).toBeDefined();
            expect(state.lockedUntil).toBeGreaterThan(Date.now());
        });

        it('persists state to localStorage', async () => {
            await recordFailedAttempt('test-account');
            
            const stored = localStorage.getItem('ledgy-auth-rate-limit');
            expect(stored).not.toBeNull();
            
            const parsed = JSON.parse(stored!);
            expect(parsed.account).toBe('test-account');
            expect(parsed.attempts).toBe(1);
        });
    });

    describe('getRateLimitState', () => {
        it('returns null when no state exists', () => {
            const state = getRateLimitState('test-account');
            expect(state).toBeNull();
        });

        it('returns state after failed attempt', async () => {
            await recordFailedAttempt('test-account');
            
            const state = getRateLimitState('test-account');
            expect(state).not.toBeNull();
            expect(state?.attempts).toBe(1);
        });

        it('returns null for wrong account', async () => {
            await recordFailedAttempt('account-1');
            
            const state = getRateLimitState('account-2');
            expect(state).toBeNull();
        });

        it('returns null if signature is missing (tampered)', async () => {
            await recordFailedAttempt('test-account');
            
            // Tamper with state
            const stored = localStorage.getItem('ledgy-auth-rate-limit');
            const parsed = JSON.parse(stored!);
            parsed.signature = '';
            localStorage.setItem('ledgy-auth-rate-limit', JSON.stringify(parsed));
            
            const state = getRateLimitState('test-account');
            expect(state).toBeNull();
        });
    });

    describe('resetRateLimit', () => {
        it('clears rate limit state', async () => {
            await recordFailedAttempt('test-account');
            
            resetRateLimit('test-account');
            
            const state = getRateLimitState('test-account');
            expect(state).toBeNull();
        });

        it('clears localStorage', async () => {
            await recordFailedAttempt('test-account');
            
            resetRateLimit('test-account');
            
            const stored = localStorage.getItem('ledgy-auth-rate-limit');
            expect(stored).toBeNull();
        });
    });

    describe('isLockedOut', () => {
        it('returns false when no state exists', () => {
            expect(isLockedOut('test-account')).toBe(false);
        });

        it('returns false when not locked', async () => {
            await recordFailedAttempt('test-account');
            expect(isLockedOut('test-account')).toBe(false);
        });

        it('returns true when locked out', async () => {
            for (let i = 0; i < 5; i++) {
                await recordFailedAttempt('test-account');
            }
            
            expect(isLockedOut('test-account')).toBe(true);
        });

        it('returns false after lockout expires', async () => {
            for (let i = 0; i < 5; i++) {
                await recordFailedAttempt('test-account');
            }
            
            // Fast-forward past lockout (15 minutes + grace period)
            vi.advanceTimersByTime(16 * 60 * 1000);
            
            expect(isLockedOut('test-account')).toBe(false);
        });
    });

    describe('getRemainingLockoutTime', () => {
        it('returns 0 when not locked out', async () => {
            await recordFailedAttempt('test-account');
            
            expect(getRemainingLockoutTime('test-account')).toBe(0);
        });

        it('returns remaining time when locked out', async () => {
            for (let i = 0; i < 5; i++) {
                await recordFailedAttempt('test-account');
            }
            
            const remaining = getRemainingLockoutTime('test-account');
            expect(remaining).toBeGreaterThan(0);
            expect(remaining).toBeLessThanOrEqual(15 * 60 + 5); // 15 minutes + grace period in seconds
        });

        it('decreases over time', async () => {
            for (let i = 0; i < 5; i++) {
                await recordFailedAttempt('test-account');
            }
            
            const initial = getRemainingLockoutTime('test-account');
            
            // Fast-forward 5 minutes
            vi.advanceTimersByTime(5 * 60 * 1000);
            
            const later = getRemainingLockoutTime('test-account');
            expect(later).toBeLessThan(initial);
        });
    });

    describe('canAttempt', () => {
        it('returns allowed when no state exists', () => {
            const result = canAttempt('test-account');
            expect(result.allowed).toBe(true);
            expect(result.waitTime).toBeUndefined();
        });

        it('returns allowed when not locked', async () => {
            await recordFailedAttempt('test-account');
            
            // Fast-forward past backoff delay
            vi.advanceTimersByTime(2000);
            
            const result = canAttempt('test-account');
            expect(result.allowed).toBe(true);
        });

        it('returns not allowed when locked out', async () => {
            for (let i = 0; i < 5; i++) {
                await recordFailedAttempt('test-account');
            }
            
            const result = canAttempt('test-account');
            expect(result.allowed).toBe(false);
            expect(result.waitTime).toBeGreaterThan(0);
        });

        it('returns not allowed during backoff delay', async () => {
            await recordFailedAttempt('test-account');
            
            // Immediately check (within backoff period)
            const result = canAttempt('test-account');
            expect(result.allowed).toBe(false);
            expect(result.waitTime).toBeGreaterThan(0);
        });
    });

    describe('cleanupExpiredEntries', () => {
        it('removes expired lockout entries', async () => {
            for (let i = 0; i < 5; i++) {
                await recordFailedAttempt('test-account');
            }
            
            // Fast-forward past lockout
            vi.advanceTimersByTime(16 * 60 * 1000);
            
            cleanupExpiredEntries();
            
            const stored = localStorage.getItem('ledgy-auth-rate-limit');
            expect(stored).toBeNull();
        });

        it('keeps non-expired entries', async () => {
            await recordFailedAttempt('test-account');
            
            // Fast-forward only 5 minutes (not expired)
            vi.advanceTimersByTime(5 * 60 * 1000);
            
            cleanupExpiredEntries();
            
            const stored = localStorage.getItem('ledgy-auth-rate-limit');
            expect(stored).not.toBeNull();
        });
    });

    describe('getAttemptCount', () => {
        it('returns 0 when no state exists', () => {
            expect(getAttemptCount('test-account')).toBe(0);
        });

        it('returns correct attempt count', async () => {
            await recordFailedAttempt('test-account');
            await recordFailedAttempt('test-account');
            await recordFailedAttempt('test-account');
            
            expect(getAttemptCount('test-account')).toBe(3);
        });
    });

    describe('getRemainingAttempts', () => {
        it('returns MAX_ATTEMPTS when no state exists', () => {
            expect(getRemainingAttempts('test-account')).toBe(5);
        });

        it('decreases with each failed attempt', async () => {
            await recordFailedAttempt('test-account');
            expect(getRemainingAttempts('test-account')).toBe(4);
            
            await recordFailedAttempt('test-account');
            expect(getRemainingAttempts('test-account')).toBe(3);
        });

        it('returns 0 when max attempts reached', async () => {
            for (let i = 0; i < 5; i++) {
                await recordFailedAttempt('test-account');
            }
            
            expect(getRemainingAttempts('test-account')).toBe(0);
        });
    });

    describe('Persistence', () => {
        it('hydrates state from localStorage', async () => {
            await recordFailedAttempt('test-account');
            
            // Simulate page reload by clearing module cache
            const state = getRateLimitState('test-account');
            expect(state).not.toBeNull();
            expect(state?.attempts).toBe(1);
        });

        it('survives multiple operations', async () => {
            await recordFailedAttempt('test-account');
            await recordFailedAttempt('test-account');
            
            // Clear and re-read
            localStorage.clear();
            await recordFailedAttempt('test-account');
            
            const state = getRateLimitState('test-account');
            expect(state?.attempts).toBe(1); // New sequence
        });
    });
});
