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
        expect(screen.getByText(/Updated|Synced/)).toBeDefined();
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
        expect(screen.getByText('Conflict detected')).toBeDefined();
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

    it('triggers sync when force sync button is clicked', () => {
        const mockTriggerSync = vi.fn();
        (useSyncStore as any).mockReturnValue({
            syncStatus: { status: 'idle' },
            isLoading: false,
            triggerSync: mockTriggerSync
        });
        (useAuthStore as any).mockReturnValue({ isUnlocked: true });

        render(<SyncStatusButton profileId="test-id" onClick={() => { }} />);

        const forceSyncButton = screen.getByRole('button', { name: 'Force Sync Now' });
        fireEvent.click(forceSyncButton);

        expect(mockTriggerSync).toHaveBeenCalledWith('test-id');
    });

    it('triggers sync when force sync button is activated via keyboard', () => {
        const mockTriggerSync = vi.fn();
        (useSyncStore as any).mockReturnValue({
            syncStatus: { status: 'idle' },
            isLoading: false,
            triggerSync: mockTriggerSync
        });
        (useAuthStore as any).mockReturnValue({ isUnlocked: true });

        render(<SyncStatusButton profileId="test-id" onClick={() => { }} />);

        const forceSyncButton = screen.getByRole('button', { name: 'Force Sync Now' });

        // Test Enter key
        fireEvent.keyDown(forceSyncButton, { key: 'Enter', code: 'Enter' });
        expect(mockTriggerSync).toHaveBeenCalledWith('test-id');

        mockTriggerSync.mockClear();

        // Test Space key
        fireEvent.keyDown(forceSyncButton, { key: ' ', code: 'Space' });
        expect(mockTriggerSync).toHaveBeenCalledWith('test-id');
    });
});
