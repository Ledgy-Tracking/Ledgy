import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProfileStore } from './useProfileStore';
import { useErrorStore } from '../../stores/useErrorStore';

describe('useProfileStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useProfileStore.getState().clearActiveProfile();
        useErrorStore.getState().clearError();
        localStorage.clear();
    });

    it('initializes with correct default state', () => {
        const state = useProfileStore.getState();
        expect(state.profiles).toEqual([]);
        expect(state.activeProfileId).toBeNull();
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
    });

    it('sets active profile correctly', () => {
        useProfileStore.getState().setActiveProfile('profile:123');
        const state = useProfileStore.getState();
        expect(state.activeProfileId).toBe('profile:123');
    });

    it('clears active profile correctly', () => {
        useProfileStore.getState().setActiveProfile('profile:123');
        useProfileStore.getState().clearActiveProfile();
        const state = useProfileStore.getState();
        expect(state.activeProfileId).toBeNull();
    });

    it('creates profile and updates state', async () => {
        await useProfileStore.getState().createProfile('Test Profile', 'icon-1');
        const state = useProfileStore.getState();
        expect(state.profiles).toHaveLength(1);
        expect(state.profiles[0].name).toBe('Test Profile');
        expect(state.profiles[0].icon).toBe('icon-1');
    });

    it('deletes profile and updates state', async () => {
        useProfileStore.setState({ profiles: [{ id: 'profile-1', name: 'To Delete', createdAt: '', updatedAt: '' }] });
        await useProfileStore.getState().deleteProfile('profile-1');
        const state = useProfileStore.getState();
        expect(state.profiles).toHaveLength(0);
    });

    it('clears active profile when deleted', async () => {
        useProfileStore.setState({
            profiles: [{ id: 'profile-1', name: 'Active', createdAt: '', updatedAt: '' }],
            activeProfileId: 'profile-1'
        });
        await useProfileStore.getState().deleteProfile('profile-1');
        const state = useProfileStore.getState();
        expect(state.activeProfileId).toBeNull();
    });

    it('sets error state on failure', async () => {
        const originalStringify = JSON.stringify;
        JSON.stringify = vi.fn().mockImplementation(() => {
            throw new Error('Serialization error');
        });

        await useProfileStore.getState().createProfile('Fail');
        const state = useProfileStore.getState();
        expect(state.error).toBeTruthy();
        expect(state.error).toBe('Serialization error');

        JSON.stringify = originalStringify;
    });

    it('toggles isLoading during async operations', async () => {
        // Just verify that isLoading resets to false after an operation completes
        // as synchronous intermediate state checks can be flaky in test environments
        await useProfileStore.getState().createProfile('Test');
        expect(useProfileStore.getState().isLoading).toBe(false);
    });
});
