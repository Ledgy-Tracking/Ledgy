import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { AutoLock } from './AutoLock';

// Create a mock state object that we can update in tests
const mockState = {
    lock: vi.fn(),
    isUnlocked: false,
};

// Mock useAuthStore to act like a Zustand hook with selectors
vi.mock('./useAuthStore', async () => {
    const actual = await vi.importActual('./useAuthStore');
    return {
        ...(actual as object),
        useAuthStore: vi.fn().mockImplementation((selector) => {
            if (typeof selector === 'function') {
                return selector(mockState);
            }
            return mockState;
        }),
    };
});

describe('AutoLock', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockState.lock.mockClear();
        mockState.isUnlocked = false;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not lock when vault is not unlocked', () => {
        mockState.isUnlocked = false;

        render(<AutoLock />);

        // Trigger visibilitychange
        act(() => {
            document.dispatchEvent(new Event('visibilitychange'));
        });

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(mockState.lock).not.toHaveBeenCalled();
    });

    it('locks on beforeunload event', () => {
        mockState.isUnlocked = true;

        render(<AutoLock />);

        act(() => {
            window.dispatchEvent(new Event('beforeunload'));
        });

        expect(mockState.lock).toHaveBeenCalledTimes(1);
    });

    it('locks on visibilitychange when tab becomes hidden', () => {
        mockState.isUnlocked = true;

        render(<AutoLock />);

        // Simulate tab becoming hidden
        Object.defineProperty(document, 'hidden', { value: true, writable: true });

        act(() => {
            document.dispatchEvent(new Event('visibilitychange'));
        });

        // Should lock after 5 second delay
        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(mockState.lock).toHaveBeenCalledTimes(1);
    });

    it('clears timeout if tab becomes visible again', () => {
        mockState.isUnlocked = true;

        render(<AutoLock />);

        // Tab becomes hidden
        Object.defineProperty(document, 'hidden', { value: true, writable: true });

        act(() => {
            document.dispatchEvent(new Event('visibilitychange'));
        });

        // Tab becomes visible again before 5 seconds
        Object.defineProperty(document, 'hidden', { value: false, writable: true });

        act(() => {
            vi.advanceTimersByTime(2000);
            document.dispatchEvent(new Event('visibilitychange'));
        });

        // Continue time - should not lock
        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(mockState.lock).not.toHaveBeenCalled();
    });

    it('does not add event listeners when not unlocked', () => {
        mockState.isUnlocked = false;

        const { unmount } = render(<AutoLock />);

        // Remove listeners should not throw even if none were added
        expect(() => unmount()).not.toThrow();
        expect(mockState.lock).not.toHaveBeenCalled();
    });

    it('cleans up event listeners on unmount', () => {
        mockState.isUnlocked = true;

        const { unmount } = render(<AutoLock />);

        // Should not throw on unmount
        expect(() => unmount()).not.toThrow();
    });
});
