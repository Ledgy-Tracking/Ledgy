import { describe, it, expect, beforeEach } from 'vitest';
import { useErrorStore } from '../src/stores/useErrorStore';

describe('useErrorStore', () => {
    beforeEach(() => {
        useErrorStore.getState().clearError();
    });

    it('initializes with no error', () => {
        const state = useErrorStore.getState();
        expect(state.error).toBeNull();
    });

    it('dispatches an error correctly', () => {
        const message = 'Something went wrong';
        useErrorStore.getState().dispatchError(message);

        const state = useErrorStore.getState();
        expect(state.error).not.toBeNull();
        expect(state.error?.message).toBe(message);
        expect(state.error?.type).toBe('error');
    });

    it('clears an error correctly', () => {
        useErrorStore.getState().dispatchError('Test error');
        useErrorStore.getState().clearError();

        const state = useErrorStore.getState();
        expect(state.error).toBeNull();
    });

    it('dispatches a warning correctly', () => {
        const message = 'This is a warning';
        useErrorStore.getState().dispatchError(message, 'warning');

        const state = useErrorStore.getState();
        expect(state.error?.message).toBe(message);
        expect(state.error?.type).toBe('warning');
    });
});
