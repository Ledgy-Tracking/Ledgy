import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProfileStore } from '../features/profiles/useProfileStore';
import { useLedgerStore } from './useLedgerStore';
import { useNodeStore } from './useNodeStore';
import { useDashboardStore } from './useDashboardStore';
import { useSyncStore } from './useSyncStore';
import { useAuthStore } from '../features/auth/useAuthStore';
import { renderHook, act } from '@testing-library/react';
import { useEffect } from 'react';

// Mock dependencies that aren't relevant to the store sweeping logic itself
vi.mock('../lib/db', () => ({
    getProfileDb: vi.fn(),
    closeProfileDb: vi.fn(),
    save_sync_config: vi.fn(),
    get_sync_config: vi.fn(),
    setup_sync: vi.fn(),
}));

// A test component to simulate App.tsx's useEffect hook without full mounting
function MemorySweepSimulator() {
    const activeProfileId = useProfileStore((state) => state.activeProfileId);

    useEffect(() => {
        useLedgerStore.getState().clearProfileData();
        useNodeStore.getState().clearProfileData();
        useDashboardStore.getState().clearProfileData();
        useSyncStore.getState().clearProfileData();
    }, [activeProfileId]);

    return null;
}

describe('Memory Sweeps (Story 2.6)', () => {
    beforeEach(() => {
        // Reset all stores to initial state
        useProfileStore.setState({ activeProfileId: null, profiles: [] });
        useLedgerStore.getState().clearProfileData();
        useNodeStore.getState().clearProfileData();
        useDashboardStore.getState().clearProfileData();
        useSyncStore.getState().clearProfileData();
        useAuthStore.setState({ isUnlocked: true, totpSecret: 'mock', rememberMe: false });
    });

    it('clears all dependent stores when activeProfileId changes', () => {
        // Render the hook that simulates the App.tsx
        renderHook(() => MemorySweepSimulator());

        // Fill stores with dummy data
        act(() => {
            useLedgerStore.setState({ schemas: [{ _id: 's1', type: 'schema', name: 'Test', fields: [], profileId: 'p1', projectId: 'proj1', schemaVersion: 1, createdAt: '', updatedAt: '' }] });
            useNodeStore.setState({ nodes: [{ id: 'n1', type: 'default', position: { x: 0, y: 0 }, data: { label: 'test' } }] });
            useDashboardStore.setState({ widgets: [{ id: 'w1', type: 'chart', title: 'Test', position: { x: 0, y: 0, w: 2, h: 2 } }] });
            useSyncStore.setState({ syncConfig: { profileId: 'p1', remoteUrl: 'http://test', continuous: true, syncDirection: 'two-way' } as any });

            // Switch profile
            useProfileStore.setState({ activeProfileId: 'profile:2' });
        });

        // Verify all stores are swept clean
        expect(useLedgerStore.getState().schemas.length).toBe(0);
        expect(useNodeStore.getState().nodes.length).toBe(0);
        expect(useDashboardStore.getState().widgets.length).toBe(0);
        expect(useSyncStore.getState().syncConfig).toBeNull();
    });

    it('clears session and profile registry upon Vault lock', async () => {
        // Set up auth session and dummy profile data
        useAuthStore.setState({ isUnlocked: true, encryptionKey: {} as CryptoKey });
        useProfileStore.setState({
            activeProfileId: 'profile:1',
            profiles: [{ id: 'profile:1', name: 'Test', createdAt: '', updatedAt: '' }]
        });

        // Act: Lock the vault
        act(() => {
            useAuthStore.getState().lock();
        });

        // We need a small delay because inside useAuthStore.lock(),
        // dynamic import is used to fetch useProfileStore.
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verify Auth state
        expect(useAuthStore.getState().isUnlocked).toBe(false);
        expect(useAuthStore.getState().encryptionKey).toBeNull();

        // Verify Profile state
        expect(useProfileStore.getState().activeProfileId).toBeNull();
        expect(useProfileStore.getState().profiles.length).toBe(0);
    });
});
