import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuthStore } from '../features/auth/useAuthStore';
import { useProfileStore } from '../features/profiles/useProfileStore';
import { useLedgerStore } from '../features/ledger/useLedgerStore';
import { useNodeStore } from '../features/nodeEditor/useNodeStore';
import { useDashboardStore } from '../features/dashboard/useDashboardStore';
import { useSyncStore } from '../features/sync/useSyncStore';
import { useEffect } from 'react';
// Simulate App.tsx effect
const useMemorySweepAppEffect = () => {
    const activeProfileId = useProfileStore(state => state.activeProfileId);

    useEffect(() => {
        useLedgerStore.getState().clearProfileData();
        useNodeStore.getState().clearProfileData();
        useDashboardStore.getState().clearProfileData();
        useSyncStore.getState().clearProfileData();
    }, [activeProfileId]);
};

describe('Memory Sweeps Integration', () => {
    beforeEach(() => {
        // Reset all stores
        useAuthStore.setState({ isUnlocked: true });
        useProfileStore.setState({ profiles: [], activeProfileId: 'profile-1' });
        useLedgerStore.getState().clearProfileData();
        useNodeStore.getState().clearProfileData();
        useDashboardStore.getState().clearProfileData();
        useSyncStore.getState().clearProfileData();
    });

    it('clears all stores when active profile changes', async () => {
        // Seed dummy data
        useLedgerStore.setState({ schemas: [{ id: '1', name: 'Test' } as any] });
        useNodeStore.setState({ nodes: [{ id: '1', position: { x: 0, y: 0 }, data: {} } as any] });
        useDashboardStore.setState({ widgets: [{ id: '1', type: 'chart' } as any] });
        useSyncStore.setState({ syncConfig: { remoteUrl: 'test' } as any });

        const { rerender } = renderHook(() => useMemorySweepAppEffect());

        // Change profile
        useProfileStore.setState({ activeProfileId: 'profile-2' });
        rerender();

        // Verify stores are empty
        expect(useLedgerStore.getState().schemas).toHaveLength(0);
        expect(useNodeStore.getState().nodes).toHaveLength(0);
        expect(useDashboardStore.getState().widgets).toHaveLength(0);
        expect(useSyncStore.getState().syncConfig).toBeNull();
    });

    it('clears all stores and profiles when vault is locked', async () => {
        // Seed dummy data including profiles
        useProfileStore.setState({
            profiles: [{ id: 'profile-1', name: 'Test', createdAt: '', updatedAt: '' }],
            activeProfileId: 'profile-1'
        });
        useLedgerStore.setState({ schemas: [{ id: '1', name: 'Test' } as any] });

        const { rerender } = renderHook(() => useMemorySweepAppEffect());

        // Lock the vault
        await useAuthStore.getState().lock();
        rerender();

        // Verify profiles are purged
        expect(useProfileStore.getState().profiles).toHaveLength(0);
        expect(useProfileStore.getState().activeProfileId).toBeNull();

        // And memory sweep occurred
        expect(useLedgerStore.getState().schemas).toHaveLength(0);
        expect(useAuthStore.getState().isUnlocked).toBe(false);
    });
});
