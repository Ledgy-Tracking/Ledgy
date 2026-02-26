import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SyncStatusButton } from './SyncStatusButton';
import { useSyncStore } from '../../stores/useSyncStore';
import { useAuthStore } from '../auth/useAuthStore';

// Mock stores
vi.mock('../../stores/useSyncStore');
vi.mock('../auth/useAuthStore');

describe('SyncStatusButton', () => {
    it('renders "Synced" state correctly', () => {
        (useSyncStore as any).mockReturnValue({
            syncStatus: { status: 'idle', lastSync: new Date().toISOString() },
            isLoading: false,
            triggerSync: vi.fn()
        });
        (useAuthStore as any).mockReturnValue({ isUnlocked: true });

        render(<SyncStatusButton profileId="test-id" onClick={() => { }} />);
        expect(screen.getByText(/Last sync:/)).toBeDefined();
    });

    it('renders "Syncing" state with animation', () => {
        (useSyncStore as any).mockReturnValue({
            syncStatus: { status: 'syncing' },
            isLoading: false,
            triggerSync: vi.fn()
        });
        (useAuthStore as any).mockReturnValue({ isUnlocked: true });

        render(<SyncStatusButton profileId="test-id" onClick={() => { }} />);
        expect(screen.getByText('Syncing...')).toBeDefined();
    });

    it('renders "Conflict" state correctly', () => {
        (useSyncStore as any).mockReturnValue({
            syncStatus: { status: 'conflict', conflictCount: 3 },
            isLoading: false,
            triggerSync: vi.fn()
        });
        (useAuthStore as any).mockReturnValue({ isUnlocked: true });

        render(<SyncStatusButton profileId="test-id" onClick={() => { }} />);
        expect(screen.getByText('Sync Conflict')).toBeDefined();
    });

    it('calls onClick when button is clicked', () => {
        const handleClick = vi.fn();
        (useSyncStore as any).mockReturnValue({
            syncStatus: { status: 'idle' },
            isLoading: false,
            triggerSync: vi.fn()
        });
        (useAuthStore as any).mockReturnValue({ isUnlocked: true });

        render(<SyncStatusButton profileId="test-id" onClick={handleClick} />);
        fireEvent.click(screen.getByTitle('Open Sync Settings'));
        expect(handleClick).toHaveBeenCalled();
    });
});
